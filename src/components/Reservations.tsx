import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { CONFIG } from '../config'

interface Reservation {
  id: string
  client_name: string
  client_firstname: string
  client_phone: string
  activity_name: string
  activity_subtype: string | null
  duration: string
  duration_minutes: number
  price: number
  payment_method: string
  contract_number: string
  jet_ski_id: string | null
  reservation_time: string
  status: string
  cart_items: unknown[] | null
}

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })

const isToday = (iso: string) =>
  new Date(iso).toISOString().slice(0, 10) === new Date().toISOString().slice(0, 10)

const isFuture = (iso: string) => new Date(iso) > new Date()

export default function Reservations() {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [startingId, setStartingId] = useState<string | null>(null)
  const [selectedJet, setSelectedJet] = useState<Record<string, string>>({})
  const [departureTime, setDepartureTime] = useState<Record<string, string>>({})
  const [showAll, setShowAll] = useState(false)
  // Jets occupés : jetId → heure de retour
  const [occupiedJets, setOccupiedJets] = useState<Record<string, string>>({})

  const fetchReservations = useCallback(async () => {
    const [resData, activeData] = await Promise.all([
      supabase
        .from('rentals')
        .select('*')
        .eq('status', 'reserved')
        .order('reservation_time', { ascending: true }),
      supabase
        .from('rentals')
        .select('jet_ski_id, end_time')
        .eq('status', 'active')
        .not('jet_ski_id', 'is', null),
    ])

    setReservations(resData.data || [])

    // Construire la map des jets occupés
    const occupied: Record<string, string> = {}
    activeData.data?.forEach(r => {
      r.jet_ski_id?.split(',').forEach((id: string) => {
        occupied[id.trim()] = r.end_time
      })
    })
    setOccupiedJets(occupied)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchReservations()
    const iv = setInterval(fetchReservations, 30000)
    return () => clearInterval(iv)
  }, [fetchReservations])

  const displayed = showAll
    ? reservations
    : reservations.filter(r => isToday(r.reservation_time))

  const handleStart = async (r: Reservation) => {
    const jetId = selectedJet[r.id] || r.jet_ski_id || ''
    const rawTime = departureTime[r.id]

    if (!jetId) { alert('⚠️ Veuillez choisir un jet ski.'); return }
    if (!rawTime) { alert('⚠️ Veuillez indiquer l\'heure de départ.'); return }

    // Calcul heure de fin
    const today = new Date().toISOString().slice(0, 10)
    const start = new Date(`${today}T${rawTime}:00`)
    const end   = new Date(start.getTime() + r.duration_minutes * 60000)

    const { error } = await supabase
      .from('rentals')
      .update({
        status:     'active',
        jet_ski_id: jetId,
        start_time: start.toISOString(),
        end_time:   end.toISOString(),
      })
      .eq('id', r.id)

    if (error) { alert('❌ Erreur lors du démarrage.'); return }

    setStartingId(null)
    setSelectedJet(prev => { const c = { ...prev }; delete c[r.id]; return c })
    setDepartureTime(prev => { const c = { ...prev }; delete c[r.id]; return c })
    fetchReservations()
  }

  const handleCancel = async (r: Reservation) => {
    if (!confirm(`Annuler la réservation de ${r.client_firstname} ${r.client_name} ?`)) return
    await supabase.from('rentals').update({ status: 'archived' }).eq('id', r.id)
    fetchReservations()
  }

  if (loading) return <div className="text-center py-16 text-gray-400">⏳ Chargement...</div>

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">📅 Réservations</h2>
          <p className="text-gray-500 text-sm mt-1">
            {displayed.length} réservation(s) {showAll ? 'au total' : "aujourd'hui"}
          </p>
        </div>
        <button
          onClick={() => setShowAll(!showAll)}
          className="text-sm border border-gray-300 px-3 py-1.5 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
        >
          {showAll ? "📅 Aujourd'hui seulement" : '📋 Toutes les réservations'}
        </button>
      </div>

      {displayed.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <div className="text-7xl mb-4">📅</div>
          <p className="text-xl font-medium">Aucune réservation {showAll ? '' : "aujourd'hui"}</p>
          <p className="text-sm mt-2">Les réservations créées à l'étape 6 apparaissent ici</p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayed.map(r => {
            const isStarting = startingId === r.id
            const timeLeft = isFuture(r.reservation_time)
              ? `dans ${Math.round((new Date(r.reservation_time).getTime() - Date.now()) / 60000)} min`
              : 'Heure dépassée'
            const isLate = !isFuture(r.reservation_time)

            return (
              <div
                key={r.id}
                className={`bg-white rounded-2xl border-2 p-5 shadow-sm transition-all ${
                  isLate ? 'border-orange-300 bg-orange-50' : 'border-blue-200'
                }`}
              >
                {/* En-tête */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        isLate ? 'bg-orange-200 text-orange-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {isLate ? '⚠️ En attente' : `📅 ${fmtTime(r.reservation_time)}`}
                      </span>
                      {!isLate && (
                        <span className="text-xs text-gray-400">{timeLeft}</span>
                      )}
                    </div>
                    <p className="font-bold text-gray-800 text-lg">
                      {r.client_firstname} {r.client_name}
                    </p>
                    <p className="text-gray-500 text-sm">{r.client_phone}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-800 text-xl">{r.price.toLocaleString()} {CONFIG.currency}</p>
                    <p className="text-gray-400 text-xs">{r.payment_method}</p>
                  </div>
                </div>

                {/* Activités */}
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-lg font-medium">
                    🚤 {r.activity_name}{r.activity_subtype ? ` — ${r.activity_subtype}` : ''}
                  </span>
                  <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-lg">
                    ⏱️ {r.duration}
                  </span>
                  {r.jet_ski_id && (
                    <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-lg">
                      🚤 {r.jet_ski_id} (souhaité)
                    </span>
                  )}
                  <span className="bg-gray-100 text-gray-400 text-xs px-2 py-0.5 rounded-lg">
                    📋 {r.contract_number} · {fmtDate(r.reservation_time)}
                  </span>
                </div>

                {/* Panel de démarrage */}
                {isStarting ? (
                  <div className="border-2 border-blue-200 rounded-xl p-4 bg-blue-50">
                    <p className="font-semibold text-blue-800 text-sm mb-3">▶️ Démarrer la location</p>

                    {/* Jet ski avec statut en temps réel */}
                    <div className="mb-3">
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                        Jet ski 🚤
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {CONFIG.jetSkis.map(jet => {
                          const isOccupied = !!occupiedJets[jet.id]
                          const isSelected = (selectedJet[r.id] || r.jet_ski_id) === jet.id
                          const endTime = occupiedJets[jet.id]
                            ? new Date(occupiedJets[jet.id]).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                            : null
                          return (
                            <button
                              key={jet.id}
                              onClick={() => {
                                if (!isOccupied) {
                                  setSelectedJet(prev => ({ ...prev, [r.id]: jet.id }))
                                }
                              }}
                              disabled={isOccupied}
                              className={`py-2 px-1 rounded-lg border-2 text-xs font-bold transition-all flex flex-col items-center gap-0.5 ${
                                isOccupied
                                  ? 'border-red-200 bg-red-50 text-red-400 cursor-not-allowed opacity-70'
                                  : isSelected
                                    ? 'border-green-500 bg-green-100 text-green-800'
                                    : 'border-gray-200 text-gray-600 hover:border-green-400 hover:bg-green-50'
                              }`}
                            >
                              <span>{isOccupied ? '🔴' : isSelected ? '✅' : '🟢'}</span>
                              <span>{jet.name}</span>
                              {isOccupied && endTime && (
                                <span className="text-red-400 font-normal text-[10px]">
                                  retour {endTime}
                                </span>
                              )}
                            </button>
                          )
                        })}
                      </div>
                      {/* Légende */}
                      <div className="flex gap-3 mt-2">
                        <span className="text-xs text-gray-400 flex items-center gap-1">🟢 Disponible</span>
                        <span className="text-xs text-gray-400 flex items-center gap-1">🔴 En mer</span>
                      </div>
                    </div>

                    {/* Heure de départ */}
                    <div className="mb-3">
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                        Heure de départ
                      </label>
                      <input
                        type="time"
                        value={departureTime[r.id] || fmtTime(r.reservation_time).replace('h', ':')}
                        onChange={e => setDepartureTime(prev => ({ ...prev, [r.id]: e.target.value }))}
                        className="border-2 border-blue-200 rounded-xl px-4 py-2.5 text-lg font-bold outline-none focus:ring-2 focus:ring-blue-400 w-full"
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => setStartingId(null)}
                        className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-600 font-semibold text-sm"
                      >
                        Annuler
                      </button>
                      <button
                        onClick={() => handleStart(r)}
                        className="flex-1 py-2.5 rounded-xl bg-green-500 text-white font-bold text-sm hover:bg-green-600 transition-colors"
                      >
                        ✅ Démarrer
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCancel(r)}
                      className="px-4 py-2.5 rounded-xl border border-red-200 text-red-500 text-sm font-semibold hover:bg-red-50 transition-colors"
                    >
                      ✕ Annuler
                    </button>
                    <button
                      onClick={() => setStartingId(r.id)}
                      className="flex-1 py-2.5 rounded-xl bg-blue-700 text-white font-bold text-sm hover:bg-blue-800 transition-colors"
                    >
                      ▶️ Le client est arrivé — Démarrer
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
