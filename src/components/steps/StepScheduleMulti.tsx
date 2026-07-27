import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { CONFIG } from '../../config'
import { CartItem } from '../../types'

const pad = (n: number) => String(n).padStart(2, '0')
const formatForInput = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`

const fmt = (iso: string) =>
  new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

const todayAt = (hhmm: string) => {
  const today = new Date().toISOString().slice(0, 10)
  return `${today}T${hhmm}`
}

interface ItemSchedule {
  startNow: boolean
  startTime: string
}

interface ReservationConflict {
  clientName: string
  reservationTime: string
}

interface Props {
  cart: CartItem[]
  onComplete: (scheduledCart: CartItem[]) => void
  onReservation: (reservationTime: string, preferredJetId: string) => void
  onBack: () => void
  isSubmitting: boolean
}

export default function StepScheduleMulti({ cart, onComplete, onReservation, onBack, isSubmitting }: Props) {
  const now = new Date()

  // ── Mode : normal ou réservation ──────────────────────────
  const [mode, setMode] = useState<'normal' | 'reservation'>('normal')

  // ── Mode NORMAL : horaires par activité ───────────────────
  const [schedules, setSchedules] = useState<Record<string, ItemSchedule>>(() =>
    Object.fromEntries(
      cart.map(item => [item.cartId, { startNow: true, startTime: formatForInput(now) }])
    )
  )
  const [jetSelections, setJetSelections] = useState<Record<string, string>>({})
  const [occupiedJets, setOccupiedJets] = useState<Record<string, string>>({})
  const [jetConflicts, setJetConflicts] = useState<Record<string, ReservationConflict | null>>({})

  // ── Mode RÉSERVATION ──────────────────────────────────────
  const [resHour, setResHour] = useState(
    `${pad(now.getHours() + 1)}:${pad(now.getMinutes())}`
  )
  const [resJetId, setResJetId] = useState('')

  // ── Charger jets occupés + réservations ───────────────────
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('rentals')
        .select('jet_ski_id, end_time, client_firstname, client_name, reservation_time, status')
        .in('status', ['active', 'reserved'])
        .not('jet_ski_id', 'is', null)

      const occupied: Record<string, string> = {}
      data?.filter(r => r.status === 'active').forEach(r => {
        r.jet_ski_id?.split(',').forEach((id: string) => {
          occupied[id.trim()] = r.end_time
        })
      })
      setOccupiedJets(occupied)
    }
    load()
  }, [])

  // ── Vérification de conflit pour un jet + heure de fin ────
  const checkConflict = async (jetId: string, endTimeISO: string): Promise<ReservationConflict | null> => {
    const { data } = await supabase
      .from('rentals')
      .select('client_firstname, client_name, reservation_time, jet_ski_id')
      .eq('status', 'reserved')
      .not('reservation_time', 'is', null)

    const endTime = new Date(endTimeISO)
    const conflict = data?.find(r => {
      if (!r.jet_ski_id?.includes(jetId)) return false
      const resTime = new Date(r.reservation_time)
      return endTime > resTime  // la location finit après l'heure de réservation
    })

    if (conflict) {
      return {
        clientName: `${conflict.client_firstname} ${conflict.client_name}`,
        reservationTime: fmt(conflict.reservation_time),
      }
    }
    return null
  }

  const handleJetSelect = async (cartId: string, jetId: string, endTimeISO: string) => {
    const alreadySelected = jetSelections[cartId] === jetId
    setJetSelections(prev => ({ ...prev, [cartId]: alreadySelected ? '' : jetId }))

    if (!alreadySelected && jetId) {
      const conflict = await checkConflict(jetId, endTimeISO)
      setJetConflicts(prev => ({ ...prev, [cartId]: conflict }))
    } else {
      setJetConflicts(prev => ({ ...prev, [cartId]: null }))
    }
  }

  const updateSchedule = (cartId: string, patch: Partial<ItemSchedule>) =>
    setSchedules(prev => ({ ...prev, [cartId]: { ...prev[cartId], ...patch } }))

  const getEndTime = (startTime: string, durationMinutes: number) =>
    new Date(new Date(startTime).getTime() + durationMinutes * 60000).toISOString()

  const atLeastOneStarting = Object.values(schedules).some(s => s.startNow)
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
            ? (jetSelections[item.cartId] || undefined) : undefined,
        }
      } else {
        return { ...item, itemStatus: 'waiting' as const, itemStartTime: null, itemEndTime: null, assignedJetSkiId: undefined }
      }
    })
    onComplete(scheduledCart)
  }

  const handleReservationConfirm = () => {
    const today = new Date().toISOString().slice(0, 10)
    const reservationISO = new Date(`${today}T${resHour}:00`).toISOString()
    onReservation(reservationISO, resJetId)
  }

  const resTimeISO = todayAt(`${resHour}:00`)
  const canReserve = resHour.length === 5

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-2">Étape 6 — Horaires</h2>

      {/* ── Toggle Mode ── */}
      <div className="grid grid-cols-2 gap-2 mb-5">
        <button
          onClick={() => setMode('normal')}
          className={`py-3 rounded-xl border-2 font-semibold text-sm transition-all ${
            mode === 'normal'
              ? 'border-green-500 bg-green-50 text-green-800'
              : 'border-gray-200 text-gray-500 hover:border-green-300'
          }`}
        >
          ▶️ Démarrer maintenant / plus tard
        </button>
        <button
          onClick={() => setMode('reservation')}
          className={`py-3 rounded-xl border-2 font-semibold text-sm transition-all ${
            mode === 'reservation'
              ? 'border-blue-500 bg-blue-50 text-blue-800'
              : 'border-gray-200 text-gray-500 hover:border-blue-300'
          }`}
        >
          📅 Réserver pour plus tard
        </button>
      </div>

      {/* ════════════ MODE NORMAL ════════════ */}
      {mode === 'normal' && (
        <>
          <p className="text-gray-500 text-sm mb-4">
            Choisissez quelles activités démarrent maintenant et lesquelles partent plus tard
          </p>

          <div className="space-y-4">
            {cart.map((item, idx) => {
              const sched = schedules[item.cartId]
              const endISO = sched.startNow
                ? getEndTime(sched.startTime, item.activity.durationMinutes) : null
              const jetsForType = item.activity.requiresJetSki
                ? CONFIG.jetSkis.filter(j => j.type === item.activity.jetType) : []
              const takenByOthers = Object.entries(jetSelections)
                .filter(([k]) => k !== item.cartId).map(([, v]) => v)
              const selectedJet = jetSelections[item.cartId] ?? ''
              const conflict = jetConflicts[item.cartId]

              return (
                <div key={item.cartId} className={`border-2 rounded-2xl p-4 transition-all ${
                  sched.startNow
                    ? item.activity.requiresJetSki && !selectedJet
                      ? 'border-orange-300 bg-orange-50'
                      : 'border-green-300 bg-green-50'
                    : 'border-gray-200 bg-white'
                }`}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-bold text-gray-800">
                        {idx + 1}. {item.activity.name}
                        {item.subtype && ` — ${item.subtype}`}
                      </p>
                      <p className="text-gray-500 text-xs">
                        {item.activity.duration} · {item.itemPrice.toLocaleString()} {CONFIG.currency}
                      </p>
                    </div>
                    {sched.startNow
                      ? <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-lg">🟢 Démarre</span>
                      : <span className="bg-gray-100 text-gray-500 text-xs font-bold px-2 py-1 rounded-lg">⏳ En attente</span>
                    }
                  </div>

                  {/* Toggle */}
                  <div className="flex gap-2 mb-3">
                    <button
                      onClick={() => updateSchedule(item.cartId, { startNow: true })}
                      className={`flex-1 py-2 rounded-xl border-2 text-sm font-semibold transition-all ${
                        sched.startNow ? 'border-green-500 bg-green-100 text-green-800' : 'border-gray-200 text-gray-500 hover:border-green-300'
                      }`}
                    >
                      ▶️ Démarrer maintenant
                    </button>
                    <button
                      onClick={() => {
                        updateSchedule(item.cartId, { startNow: false })
                        setJetSelections(prev => { const n = { ...prev }; delete n[item.cartId]; return n })
                        setJetConflicts(prev => { const n = { ...prev }; delete n[item.cartId]; return n })
                      }}
                      className={`flex-1 py-2 rounded-xl border-2 text-sm font-semibold transition-all ${
                        !sched.startNow ? 'border-orange-400 bg-orange-50 text-orange-700' : 'border-gray-200 text-gray-500 hover:border-orange-300'
                      }`}
                    >
                      ⏳ Plus tard
                    </button>
                  </div>

                  {sched.startNow && (
                    <div className="space-y-3">
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

                      {item.activity.requiresJetSki && jetsForType.length > 0 && (
                        <div className={`rounded-xl p-3 border ${selectedJet ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'}`}>
                          <p className={`text-xs font-bold mb-2 ${selectedJet ? 'text-blue-700' : 'text-orange-700'}`}>
                            🚤 Choisir le jet ski
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
                                  onClick={async () => {
                                    if (!isDisabled && endISO) {
                                      await handleJetSelect(item.cartId, jet.id, endISO)
                                    }
                                  }}
                                  disabled={isDisabled}
                                  className={`px-3 py-2 rounded-xl border-2 text-sm font-bold transition-all flex items-center gap-1.5 ${
                                    isDisabled ? 'border-red-200 bg-red-50 text-red-400 opacity-60 cursor-not-allowed'
                                    : isSelected ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                                    : 'border-blue-200 bg-white text-blue-700 hover:border-blue-400 hover:bg-blue-50'
                                  }`}
                                >
                                  <span>{isOccupied ? '❌' : isTakenByOther ? '⬆️' : isSelected ? '✅' : '🚤'}</span>
                                  <span>{jet.name}</span>
                                  {isOccupied && <span className="text-red-400 text-xs font-normal">{fmt(occupiedJets[jet.id])}</span>}
                                </button>
                              )
                            })}
                          </div>

                          {/* ⚠️ Alerte conflit réservation (non bloquante) */}
                          {conflict && (
                            <div className="mt-2 bg-amber-50 border border-amber-300 rounded-xl p-2.5">
                              <p className="text-amber-800 text-xs font-bold">
                                ⚠️ Attention — Réservation sur ce jet
                              </p>
                              <p className="text-amber-700 text-xs mt-0.5">
                                <strong>{conflict.clientName}</strong> a réservé ce jet à <strong>{conflict.reservationTime}</strong>.
                                Cette location se termine après cette heure.
                              </p>
                              <p className="text-amber-600 text-xs mt-1 font-medium">
                                Vous pouvez quand même continuer si vous le souhaitez.
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {!sched.startNow && (
                    <div className="bg-orange-50 rounded-xl px-3 py-2 border border-orange-100">
                      <p className="text-orange-600 text-sm">
                        ⏳ Démarrera depuis "Locations actives"
                        {item.activity.requiresJetSki && (
                          <span className="block text-orange-500 text-xs mt-0.5">🚤 Jet ski choisi au démarrage</span>
                        )}
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {!atLeastOneStarting && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-3">
              <p className="text-red-600 text-sm text-center">⚠️ Au moins une activité doit démarrer maintenant</p>
            </div>
          )}
          {atLeastOneStarting && missingJets.length > 0 && (
            <div className="mt-4 bg-orange-50 border border-orange-200 rounded-xl p-3">
              <p className="text-orange-700 text-sm text-center font-medium">
                🚤 Veuillez assigner un jet ski pour :
                {missingJets.map(i => <span key={i.cartId} className="block text-orange-600 text-xs">→ {i.activity.name}</span>)}
              </p>
            </div>
          )}
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
            <button onClick={onBack} className="flex-1 bg-gray-100 text-gray-700 py-3.5 rounded-2xl font-semibold hover:bg-gray-200 transition-colors">
              ← Retour
            </button>
            <button onClick={handleConfirm} disabled={!canConfirm || isSubmitting}
              className="flex-1 bg-green-600 text-white py-3.5 rounded-2xl font-bold disabled:opacity-40 hover:bg-green-700 transition-colors">
              {isSubmitting ? '⏳ Enregistrement...' : '✅ Valider'}
            </button>
          </div>
        </>
      )}

      {/* ════════════ MODE RÉSERVATION ════════════ */}
      {mode === 'reservation' && (
        <div>
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 mb-5">
            <p className="font-bold text-blue-800 mb-1">📅 Réservation pour plus tard</p>
            <p className="text-blue-600 text-sm">
              Le contrat et le paiement sont déjà enregistrés. Le jet ski n'est pas bloqué.
              Vous retrouverez cette réservation dans l'onglet "Réservations".
            </p>
          </div>

          {/* Heure de réservation */}
          <div className="mb-5">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              🕐 Heure de réservation <span className="text-red-500">*</span>
            </label>
            <input
              type="time"
              value={resHour}
              onChange={e => setResHour(e.target.value)}
              className="w-full border-2 border-blue-300 rounded-2xl px-4 py-4 text-3xl font-bold text-center focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Jet ski souhaité (optionnel) */}
          <div className="mb-5">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              🚤 Jet ski souhaité
              <span className="text-gray-400 font-normal ml-1">(optionnel — pas bloqué)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {CONFIG.jetSkis.map(jet => (
                <button
                  key={jet.id}
                  onClick={() => setResJetId(resJetId === jet.id ? '' : jet.id)}
                  className={`px-4 py-2.5 rounded-xl border-2 text-sm font-bold transition-all ${
                    resJetId === jet.id
                      ? 'border-blue-500 bg-blue-100 text-blue-800'
                      : 'border-gray-200 text-gray-600 hover:border-blue-300'
                  }`}
                >
                  🚤 {jet.name}
                </button>
              ))}
            </div>
          </div>

          {/* Résumé */}
          {canReserve && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-5">
              <p className="text-blue-800 font-semibold text-center text-lg">
                📅 Réservation à <strong>{resHour}</strong>
              </p>
              {resJetId && (
                <p className="text-blue-600 text-sm text-center mt-1">
                  🚤 Jet souhaité : <strong>{resJetId}</strong> (disponible pour d'autres locations)
                </p>
              )}
              <p className="text-blue-500 text-xs text-center mt-1">
                {cart.map(i => i.activity.name).join(' + ')}
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={onBack} className="flex-1 bg-gray-100 text-gray-700 py-3.5 rounded-2xl font-semibold hover:bg-gray-200 transition-colors">
              ← Retour
            </button>
            <button
              onClick={handleReservationConfirm}
              disabled={!canReserve || isSubmitting}
              className="flex-1 bg-blue-700 text-white py-3.5 rounded-2xl font-bold disabled:opacity-40 hover:bg-blue-800 transition-colors"
            >
              {isSubmitting ? '⏳ Enregistrement...' : '📅 Enregistrer la réservation'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
