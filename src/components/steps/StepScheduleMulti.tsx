import { useState } from 'react'
import { CONFIG } from '../../config'
import { CartItem } from '../../types'

const pad = (n: number) => String(n).padStart(2, '0')
const formatForInput = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`

const fmt = (iso: string) =>
  new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

interface ItemSchedule {
  startNow: boolean
  startTime: string
}

interface Props {
  cart: CartItem[]
  onComplete: (scheduledCart: CartItem[]) => void
  onBack: () => void
  isSubmitting: boolean
}

export default function StepScheduleMulti({ cart, onComplete, onBack, isSubmitting }: Props) {
  const now = new Date()

  // Initialiser chaque activité avec "démarrer maintenant" par défaut
  const [schedules, setSchedules] = useState<Record<string, ItemSchedule>>(() =>
    Object.fromEntries(
      cart.map(item => [
        item.cartId,
        { startNow: true, startTime: formatForInput(now) },
      ])
    )
  )

  const updateSchedule = (cartId: string, patch: Partial<ItemSchedule>) => {
    setSchedules(prev => ({
      ...prev,
      [cartId]: { ...prev[cartId], ...patch },
    }))
  }

  // Calculer l'heure de fin d'une activité
  const getEndTime = (startTime: string, durationMinutes: number) => {
    const end = new Date(new Date(startTime).getTime() + durationMinutes * 60000)
    return end.toISOString()
  }

  const atLeastOneStarting = Object.values(schedules).some(s => s.startNow)

  const handleConfirm = () => {
    const scheduledCart: CartItem[] = cart.map(item => {
      const sched = schedules[item.cartId]
      if (sched.startNow) {
        return {
          ...item,
          itemStatus: 'active' as const,
          itemStartTime: new Date(sched.startTime).toISOString(),
          itemEndTime: getEndTime(sched.startTime, item.activity.durationMinutes),
        }
      } else {
        return {
          ...item,
          itemStatus: 'waiting' as const,
          itemStartTime: null,
          itemEndTime: null,
        }
      }
    })
    onComplete(scheduledCart)
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-2">Horaires des activités</h2>
      <p className="text-gray-500 text-sm mb-5">
        Choisissez quelles activités démarrent maintenant et lesquelles partent plus tard
      </p>

      <div className="space-y-4">
        {cart.map((item, idx) => {
          const sched = schedules[item.cartId]
          const endISO = sched.startNow
            ? getEndTime(sched.startTime, item.activity.durationMinutes)
            : null

          return (
            <div
              key={item.cartId}
              className={`border-2 rounded-2xl p-4 transition-all ${
                sched.startNow ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-white'
              }`}
            >
              {/* Header activité */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-bold text-gray-800">
                    {idx + 1}. {item.activity.name}
                    {item.subtype && ` — ${item.subtype}`}
                    {item.numberOfPersons && item.numberOfPersons > 1 && ` (${item.numberOfPersons}p)`}
                  </p>
                  <p className="text-gray-500 text-xs">{item.activity.duration} · {item.itemPrice.toLocaleString()} {CONFIG.currency}</p>
                </div>
                {sched.startNow ? (
                  <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-lg">🟢 Démarre</span>
                ) : (
                  <span className="bg-gray-100 text-gray-500 text-xs font-bold px-2 py-1 rounded-lg">⏳ En attente</span>
                )}
              </div>

              {/* Toggle Démarrer maintenant / Plus tard */}
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => updateSchedule(item.cartId, { startNow: true })}
                  className={`flex-1 py-2 rounded-xl border-2 text-sm font-semibold transition-all ${
                    sched.startNow
                      ? 'border-green-500 bg-green-100 text-green-800'
                      : 'border-gray-200 text-gray-500 hover:border-green-300'
                  }`}
                >
                  ▶️ Démarrer maintenant
                </button>
                <button
                  onClick={() => updateSchedule(item.cartId, { startNow: false })}
                  className={`flex-1 py-2 rounded-xl border-2 text-sm font-semibold transition-all ${
                    !sched.startNow
                      ? 'border-orange-400 bg-orange-50 text-orange-700'
                      : 'border-gray-200 text-gray-500 hover:border-orange-300'
                  }`}
                >
                  ⏳ Démarrer plus tard
                </button>
              </div>

              {/* Time picker si démarrage immédiat */}
              {sched.startNow && (
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">🕐 Heure de départ</label>
                  <input
                    type="datetime-local"
                    value={sched.startTime}
                    onChange={e => updateSchedule(item.cartId, { startTime: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-green-400 outline-none"
                  />
                  {endISO && (
                    <div className="mt-2 bg-white rounded-xl px-3 py-2 border border-green-200">
                      <p className="text-green-700 text-sm font-medium">
                        {fmt(sched.startTime)} → {fmt(endISO)}
                        <span className="text-green-500 text-xs ml-2">({item.activity.duration})</span>
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Message si en attente */}
              {!sched.startNow && (
                <div className="bg-orange-50 rounded-xl px-3 py-2 border border-orange-100">
                  <p className="text-orange-600 text-sm">
                    ⏳ Cette activité démarrera plus tard depuis "Locations actives"
                  </p>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Avertissement si rien ne démarre */}
      {!atLeastOneStarting && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-3">
          <p className="text-red-600 text-sm text-center">
            ⚠️ Au moins une activité doit démarrer maintenant
          </p>
        </div>
      )}

      {/* Résumé */}
      {atLeastOneStarting && (
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-3 space-y-1">
          {cart.map(item => {
            const sched = schedules[item.cartId]
            return (
              <p key={item.cartId} className="text-sm text-blue-800">
                {sched.startNow ? '▶️' : '⏳'}{' '}
                <strong>{item.activity.name}{item.subtype ? ` — ${item.subtype}` : ''}</strong>
                {sched.startNow ? ` · ${fmt(sched.startTime)} → ${fmt(getEndTime(sched.startTime, item.activity.durationMinutes))}` : ' · En attente'}
              </p>
            )
          })}
        </div>
      )}

      <div className="flex gap-3 mt-5">
        <button
          onClick={onBack}
          className="flex-1 bg-gray-100 text-gray-700 py-3.5 rounded-2xl font-semibold hover:bg-gray-200 transition-colors"
        >
          ← Retour
        </button>
        <button
          onClick={handleConfirm}
          disabled={!atLeastOneStarting || isSubmitting}
          className="flex-1 bg-green-600 text-white py-3.5 rounded-2xl font-bold disabled:opacity-40 hover:bg-green-700 transition-colors"
        >
          {isSubmitting ? '⏳ Enregistrement...' : '✅ Valider & Démarrer'}
        </button>
      </div>
    </div>
  )
}
