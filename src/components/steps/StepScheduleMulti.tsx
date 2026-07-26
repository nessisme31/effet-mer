import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
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

  // ── Horaires par activité ──────────────────────────────────
  const [schedules, setSchedules] = useState<Record<string, ItemSchedule>>(() =>
    Object.fromEntries(
      cart.map(item => [
        item.cartId,
        { startNow: true, startTime: formatForInput(now) },
      ])
    )
  )

  // ── Sélection jet ski par activité (cartId → jetId) ────────
  const [jetSelections, setJetSelections] = useState<Record<string, string>>({})

  // ── Jets occupés (chargés depuis les locations actives) ────
  const [occupiedJets, setOccupiedJets] = useState<Record<string, string>>({})  // jetId → endTime

  useEffect(() => {
    const fetchOccupied = async () => {
      const { data } = await supabase
        .from('rentals')
        .select('jet_ski_id, end_time')
        .eq('status', 'active')
        .not('jet_ski_id', 'is', null)
      const map: Record<string, string> = {}
      data?.forEach(r => {
        r.jet_ski_id?.split(',').forEach((id: string) => {
          map[id.trim()] = r.end_time
        })
      })
      setOccupiedJets(map)
    }
    fetchOccupied()
  }, [])

  const updateSchedule = (cartId: string, patch: Partial<ItemSchedule>) =>
    setSchedules(prev => ({ ...prev, [cartId]: { ...prev[cartId], ...patch } }))

  const getEndTime = (startTime: string, durationMinutes: number) =>
    new Date(new Date(startTime).getTime() + durationMinutes * 60000).toISOString()

  const atLeastOneStarting = Object.values(schedules).some(s => s.startNow)

  // ── Validation : les jets ski qui démarrent maintenant doivent avoir un jet ──
  const missingJets = cart.filter(item =>
    item.activity.requiresJetSki &&
    schedules[item.cartId]?.startNow &&
    !jetSelections[item.cartId]
  )
  const canConfirm = atLeastOneStarting && missingJets.length === 0

  const handleConfirm = () => {
    const scheduledCart: CartItem[] = cart.map(item => {
      const sched = schedules[item.cartId]
      if (sched.startNow) {
        return {
          ...item,
          itemStatus: 'active' as const,
          itemStartTime: new Date(sched.startTime).toISOString(),
          itemEndTime: getEndTime(sched.startTime, item.activity.durationMinutes),
          assignedJetSkiId: item.activity.requiresJetSki
            ? (jetSelections[item.cartId] || undefined)
            : undefined,
        }
      } else {
        return {
          ...item,
          itemStatus: 'waiting' as const,
          itemStartTime: null,
          itemEndTime: null,
          assignedJetSkiId: undefined,   // sera choisi au moment du démarrage
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

          // Jets pour ce type, en retirant ceux pris par d'autres items "start now"
          const jetsForType = item.activity.requiresJetSki
            ? CONFIG.jetSkis.filter(j => j.type === item.activity.jetType)
            : []
          const takenByOthers = Object.entries(jetSelections)
            .filter(([k]) => k !== item.cartId)
            .map(([, v]) => v)

          const selectedJet = jetSelections[item.cartId] ?? ''

          return (
            <div
              key={item.cartId}
              className={`border-2 rounded-2xl p-4 transition-all ${
                sched.startNow
                  ? item.activity.requiresJetSki && !selectedJet
                    ? 'border-orange-300 bg-orange-50'   // jet manquant → orange
                    : 'border-green-300 bg-green-50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              {/* ── En-tête activité ── */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-bold text-gray-800">
                    {idx + 1}. {item.activity.name}
                    {item.subtype && ` — ${item.subtype}`}
                    {item.numberOfPersons && item.numberOfPersons > 1 && ` (${item.numberOfPersons}p)`}
                  </p>
                  <p className="text-gray-500 text-xs">
                    {item.activity.duration} · {item.itemPrice.toLocaleString()} {CONFIG.currency}
                  </p>
                </div>
                {sched.startNow ? (
                  <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-lg">
                    🟢 Démarre
                  </span>
                ) : (
                  <span className="bg-gray-100 text-gray-500 text-xs font-bold px-2 py-1 rounded-lg">
                    ⏳ En attente
                  </span>
                )}
              </div>

              {/* ── Toggle maintenant / plus tard ── */}
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
                  onClick={() => {
                    updateSchedule(item.cartId, { startNow: false })
                    // Efface le jet sélectionné si on passe en "plus tard"
                    setJetSelections(prev => { const n = { ...prev }; delete n[item.cartId]; return n })
                  }}
                  className={`flex-1 py-2 rounded-xl border-2 text-sm font-semibold transition-all ${
                    !sched.startNow
                      ? 'border-orange-400 bg-orange-50 text-orange-700'
                      : 'border-gray-200 text-gray-500 hover:border-orange-300'
                  }`}
                >
                  ⏳ Démarrer plus tard
                </button>
              </div>

              {/* ── Si démarrage maintenant ── */}
              {sched.startNow && (
                <div className="space-y-3">
                  {/* Time picker */}
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

                  {/* ── Sélecteur jet ski (si activité jet ski) ── */}
                  {item.activity.requiresJetSki && jetsForType.length > 0 && (
                    <div className={`rounded-xl p-3 border ${
                      selectedJet ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'
                    }`}>
                      <p className={`text-xs font-bold mb-2 ${selectedJet ? 'text-blue-700' : 'text-orange-700'}`}>
                        🚤 Choisir le jet ski ({item.activity.jetType})
                        {!selectedJet && <span className="ml-1 text-orange-500">— requis</span>}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {jetsForType.map(jet => {
                          const isOccupied = !!occupiedJets[jet.id]
                          const isTakenByOther = takenByOthers.includes(jet.id)
                          const isSelected = selectedJet === jet.id
                          const isDisabled = isOccupied || isTakenByOther

                          return (
                            <button
                              key={jet.id}
                              onClick={() => {
                                if (!isDisabled) {
                                  setJetSelections(prev => ({
                                    ...prev,
                                    [item.cartId]: isSelected ? '' : jet.id,
                                  }))
                                }
                              }}
                              disabled={isDisabled}
                              title={
                                isOccupied ? `Sorti — retour à ${fmt(occupiedJets[jet.id])}`
                                : isTakenByOther ? 'Déjà assigné à une autre activité'
                                : isSelected ? 'Désélectionner'
                                : 'Sélectionner ce jet'
                              }
                              className={`px-3 py-2 rounded-xl border-2 text-sm font-bold transition-all flex items-center gap-1.5 ${
                                isDisabled
                                  ? 'border-red-200 bg-red-50 text-red-400 opacity-60 cursor-not-allowed'
                                  : isSelected
                                  ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                                  : 'border-blue-200 bg-white text-blue-700 hover:border-blue-400 hover:bg-blue-50'
                              }`}
                            >
                              <span>{isOccupied ? '❌' : isTakenByOther ? '⬆️' : isSelected ? '✅' : '🚤'}</span>
                              <span>{jet.name}</span>
                              {isOccupied && (
                                <span className="text-red-400 text-xs font-normal">
                                  {fmt(occupiedJets[jet.id])}
                                </span>
                              )}
                            </button>
                          )
                        })}
                      </div>
                      {selectedJet && (
                        <p className="text-blue-600 text-xs mt-1.5 font-medium">
                          ✅ {selectedJet} assigné
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ── Message si "plus tard" ── */}
              {!sched.startNow && (
                <div className="bg-orange-50 rounded-xl px-3 py-2 border border-orange-100">
                  <p className="text-orange-600 text-sm">
                    ⏳ Cette activité démarrera plus tard depuis "Locations actives"
                    {item.activity.requiresJetSki && (
                      <span className="block text-orange-500 text-xs mt-0.5">
                        🚤 Le jet ski sera choisi au moment du démarrage
                      </span>
                    )}
                  </p>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Avertissement si rien ne démarre ── */}
      {!atLeastOneStarting && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-3">
          <p className="text-red-600 text-sm text-center">
            ⚠️ Au moins une activité doit démarrer maintenant
          </p>
        </div>
      )}

      {/* ── Avertissement jets manquants ── */}
      {atLeastOneStarting && missingJets.length > 0 && (
        <div className="mt-4 bg-orange-50 border border-orange-200 rounded-xl p-3">
          <p className="text-orange-700 text-sm text-center font-medium">
            🚤 Veuillez assigner un jet ski pour :
            {missingJets.map(i => (
              <span key={i.cartId} className="block text-orange-600 text-xs">
                → {i.activity.name}
              </span>
            ))}
          </p>
        </div>
      )}

      {/* ── Résumé ── */}
      {canConfirm && (
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-3 space-y-1">
          {cart.map(item => {
            const sched = schedules[item.cartId]
            return (
              <p key={item.cartId} className="text-sm text-blue-800">
                {sched.startNow ? '▶️' : '⏳'}{' '}
                <strong>{item.activity.name}{item.subtype ? ` — ${item.subtype}` : ''}</strong>
                {sched.startNow
                  ? ` · ${fmt(sched.startTime)} → ${fmt(getEndTime(sched.startTime, item.activity.durationMinutes))}`
                  : ' · En attente'}
                {sched.startNow && item.activity.requiresJetSki && jetSelections[item.cartId] && (
                  <span className="text-blue-600"> · 🚤 {jetSelections[item.cartId]}</span>
                )}
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
          disabled={!canConfirm || isSubmitting}
          className="flex-1 bg-green-600 text-white py-3.5 rounded-2xl font-bold disabled:opacity-40 hover:bg-green-700 transition-colors"
        >
          {isSubmitting ? '⏳ Enregistrement...' : '✅ Valider'}
        </button>
      </div>
    </div>
  )
}
