import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { CONFIG } from '../config'
import { Rental, WaitingEntry } from '../types'

interface Props {
  onNewRental: () => void
}

const fmt = (iso: string) =>
  new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })

const pad = (n: number) => String(n).padStart(2, '0')
const formatForInput = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`

// ─── Panel d'attribution de jet ski ─────────────────────────
interface AssignPanelProps {
  rental: Rental
  onConfirm: () => void
  onCancel: () => void
}

function AssignJetPanel({ rental, onConfirm, onCancel }: AssignPanelProps) {
  const [selectedJet, setSelectedJet] = useState('')
  const [startTime, setStartTime] = useState(formatForInput(new Date()))
  const [submitting, setSubmitting] = useState(false)
  const [rentalMap, setRentalMap] = useState<Record<string, { clientFirstname: string; clientName: string; endTime: string }>>({})

  // Déterminer le type de jet à partir du panier
  const cartItems = rental.cart_items ?? []
  const jetItem = cartItems.find(item => item.activity.requiresJetSki)
  const jetType = jetItem?.activity.jetType ?? 'VX'
  const jets = CONFIG.jetSkis.filter(j => j.type === jetType)

  useEffect(() => {
    const fetchOccupied = async () => {
      const { data } = await supabase
        .from('rentals')
        .select('jet_ski_id, end_time, client_firstname, client_name')
        .eq('status', 'active')
        .not('jet_ski_id', 'is', null)

      const map: Record<string, { clientFirstname: string; clientName: string; endTime: string }> = {}
      data?.forEach(r => {
        if (r.jet_ski_id) {
          map[r.jet_ski_id] = {
            endTime: r.end_time,
            clientFirstname: r.client_firstname,
            clientName: r.client_name,
          }
        }
      })
      setRentalMap(map)
    }
    fetchOccupied()
  }, [])

  const durationMinutes = jetItem?.activity.durationMinutes ?? rental.duration_minutes ?? 30

  // Calcul de l'heure de fin (corrigé : endTime est un string ISO)
  const endTimeDate = new Date(new Date(startTime).getTime() + durationMinutes * 60000)
  const endTimeISO = endTimeDate.toISOString()
  const endTimeDisplay = endTimeDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

  const handleConfirm = async () => {
    if (!selectedJet) return
    setSubmitting(true)
    try {
      const start = new Date(startTime)
      const { error } = await supabase
        .from('rentals')
        .update({
          jet_ski_id: selectedJet,
          start_time: start.toISOString(),
          end_time: endTimeISO,
          status: 'active',
        })
        .eq('id', rental.id)

      if (error) throw error
      onConfirm()
    } catch (err) {
      console.error(err)
      alert('❌ Erreur lors de l\'attribution.')
    }
    setSubmitting(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
        <h3 className="text-lg font-bold text-gray-800 mb-1">🚤 Attribuer un jet ski</h3>
        <p className="text-gray-500 text-sm mb-4">
          {rental.client_firstname} {rental.client_name}
        </p>

        {/* Sélection du jet */}
        <p className="text-sm font-semibold text-gray-700 mb-2">
          Jet Ski {jetType} disponible :
        </p>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {jets.map(jet => {
            const isOccupied = !!rentalMap[jet.id]
            return (
              <button
                key={jet.id}
                onClick={() => !isOccupied && setSelectedJet(jet.id)}
                disabled={isOccupied}
                className={`p-3 rounded-xl border-2 text-center font-bold text-sm transition-all ${
                  isOccupied
                    ? 'border-red-200 bg-red-50 text-red-400 cursor-not-allowed'
                    : selectedJet === jet.id
                    ? 'border-green-500 bg-green-50 text-green-800 ring-2 ring-green-300'
                    : 'border-gray-200 bg-white text-gray-800 hover:border-green-400 hover:bg-green-50/50'
                }`}
              >
                <div className="text-2xl mb-1">🚤</div>
                <div>{jet.name}</div>
                {isOccupied ? (
                  <div className="text-xs text-red-400 mt-0.5">
                    Retour {fmt(rentalMap[jet.id].endTime)}
                  </div>
                ) : (
                  <div className="text-xs text-green-500 mt-0.5">Disponible</div>
                )}
              </button>
            )
          })}
        </div>

        {/* Heure de départ */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            🕐 Heure de départ
          </label>
          <input
            type="datetime-local"
            value={startTime}
            onChange={e => setStartTime(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        {/* Récap horaires */}
        {selectedJet && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4 text-sm">
            <p className="text-green-800 font-medium">
              🚤 {selectedJet} · Départ {fmt(startTime)} → Retour {endTimeDisplay}
            </p>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-200"
          >
            Annuler
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedJet || submitting}
            className="flex-1 bg-green-600 text-white py-2.5 rounded-xl text-sm font-bold disabled:opacity-40 hover:bg-green-700 transition-colors"
          >
            {submitting ? '...' : '▶️ Démarrer'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Composant principal ────────────────────────────────────
export default function ActiveRentals({ onNewRental }: Props) {
  const [rentals, setRentals] = useState<Rental[]>([])
  const [pendingJetRentals, setPendingJetRentals] = useState<Rental[]>([])
  const [waiting, setWaiting] = useState<WaitingEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [returnAlert, setReturnAlert] = useState<{ jetId: string; waiters: WaitingEntry[] } | null>(null)
  const [assigningRental, setAssigningRental] = useState<Rental | null>(null)

  const fetchAll = useCallback(async () => {
    const [activeRes, pendingRes, waitingRes] = await Promise.all([
      supabase
        .from('rentals')
        .select('*')
        .eq('status', 'active')
        .order('start_time', { ascending: true }),
      supabase
        .from('rentals')
        .select('*')
        .eq('status', 'pending_jet')
        .order('created_at', { ascending: true }),
      supabase
        .from('waiting_list')
        .select('*')
        .eq('status', 'waiting')
        .order('created_at', { ascending: true }),
    ])
    setRentals(activeRes.data || [])
    setPendingJetRentals(pendingRes.data || [])
    setWaiting(waitingRes.data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchAll()
    const interval = setInterval(fetchAll, 30000)
    return () => clearInterval(interval)
  }, [fetchAll])

  const handleReturn = async (rental: Rental) => {
    const name = `${rental.client_firstname} ${rental.client_name}`
    if (!confirm(`Confirmer le retour de ${name} ?`)) return

    await supabase.from('rentals').update({ status: 'archived' }).eq('id', rental.id)

    if (rental.jet_ski_id) {
      const waiters = waiting.filter(w => w.jet_ski_id === rental.jet_ski_id)
      if (waiters.length > 0) {
        setReturnAlert({ jetId: rental.jet_ski_id, waiters })
      }
    }

    fetchAll()
  }

  const handleCancelWaiting = async (id: string) => {
    if (!confirm('Annuler cette file d\'attente ?')) return
    await supabase.from('waiting_list').update({ status: 'cancelled' }).eq('id', id)
    fetchAll()
  }

  const handleConvertWaiting = async (entry: WaitingEntry) => {
    await supabase.from('waiting_list').update({ status: 'converted' }).eq('id', entry.id)
    setReturnAlert(null)
    onNewRental()
  }

  const handleCancelPendingJet = async (id: string) => {
    if (!confirm('Annuler cette location en attente de jet ?')) return
    await supabase.from('rentals').update({ status: 'archived' }).eq('id', id)
    fetchAll()
  }

  if (loading) {
    return <div className="text-center py-16 text-gray-400">⏳ Chargement...</div>
  }

  const hasAnything = rentals.length > 0 || pendingJetRentals.length > 0 || waiting.length > 0

  return (
    <div>
      {/* Modal d'attribution de jet ski */}
      {assigningRental && (
        <AssignJetPanel
          rental={assigningRental}
          onConfirm={() => {
            setAssigningRental(null)
            fetchAll()
          }}
          onCancel={() => setAssigningRental(null)}
        />
      )}

      {/* Modal de file d'attente au retour */}
      {returnAlert && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <div className="text-center mb-4">
              <div className="text-5xl mb-3">🔔</div>
              <h3 className="text-xl font-bold text-orange-700">File d'attente !</h3>
              <p className="text-gray-600 text-sm mt-1">
                Le jet <strong>{returnAlert.jetId}</strong> vient d'être rendu.
              </p>
            </div>

            <div className="space-y-3 mb-5">
              {returnAlert.waiters.map((waiter, i) => (
                <div key={waiter.id} className="bg-orange-50 border border-orange-200 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-orange-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                      {i + 1}
                    </span>
                    <p className="font-bold text-orange-800">
                      {waiter.client_firstname} {waiter.client_name}
                    </p>
                  </div>
                  <p className="text-orange-600 text-sm">{waiter.client_phone}</p>
                  {i === 0 && (
                    <button
                      onClick={() => handleConvertWaiting(waiter)}
                      className="w-full mt-2 bg-green-500 text-white py-2 rounded-xl text-sm font-bold hover:bg-green-600"
                    >
                      ➕ Démarrer sa location maintenant
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={() => setReturnAlert(null)}
              className="w-full bg-gray-100 text-gray-700 py-2.5 rounded-xl font-medium hover:bg-gray-200"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Locations actives</h2>
          <p className="text-gray-500 text-sm mt-1">
            {fmtDate(new Date().toISOString())} · {rentals.length} en cours
            {pendingJetRentals.length > 0 && (
              <span className="ml-2 text-yellow-600 font-medium">
                · {pendingJetRentals.length} en attente de jet
              </span>
            )}
            {waiting.length > 0 && (
              <span className="ml-2 text-orange-600 font-medium">
                · {waiting.length} en file d'attente
              </span>
            )}
          </p>
        </div>
        <button
          onClick={onNewRental}
          className="bg-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-blue-800 transition-colors shadow"
        >
          ➕ Nouvelle
        </button>
      </div>

      {!hasAnything ? (
        <div className="text-center py-20">
          <div className="text-7xl mb-4">🌊</div>
          <p className="text-xl text-gray-500 font-medium">Aucune location en cours</p>
          <p className="text-gray-400 text-sm mt-2">Cliquez sur "Nouvelle" pour démarrer</p>
          <button
            onClick={onNewRental}
            className="mt-6 bg-blue-700 text-white px-8 py-3 rounded-xl font-semibold hover:bg-blue-800 transition-colors"
          >
            ➕ Démarrer une location
          </button>
        </div>
      ) : (
        <>
          {/* ── Section : En attente de jet ski ── */}
          {pendingJetRentals.length > 0 && (
            <div className="mb-6">
              <h3 className="text-base font-bold text-yellow-700 mb-3 flex items-center gap-2">
                <span>🟡</span> En attente d'attribution de jet ski ({pendingJetRentals.length})
              </h3>
              <div className="space-y-3">
                {pendingJetRentals.map(rental => {
                  const cartItems = rental.cart_items ?? []
                  const activities = cartItems.map(item => {
                    let s = item.activity.name
                    if (item.subtype) s += ` — ${item.subtype}`
                    if (item.numberOfPersons && item.numberOfPersons > 1) s += ` (${item.numberOfPersons}p)`
                    return s
                  }).join(' + ') || rental.activity_name

                  return (
                    <div
                      key={rental.id}
                      className="bg-white border-2 border-yellow-300 rounded-2xl p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-bold text-gray-800 text-lg">
                            {rental.client_firstname} {rental.client_name}
                          </h4>
                          <p className="text-gray-500 text-sm">{rental.client_phone}</p>
                        </div>
                        <span className="bg-yellow-100 text-yellow-700 text-xs font-bold px-3 py-1 rounded-full">
                          🟡 En attente
                        </span>
                      </div>

                      <div className="bg-yellow-50 rounded-xl p-3 mb-3">
                        <p className="text-gray-600 text-sm font-medium">{activities}</p>
                        <p className="text-yellow-700 text-xs mt-1">
                          Paiement : {rental.payment_method}
                        </p>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-bold text-xl text-gray-800">
                            {rental.price.toLocaleString()} {CONFIG.currency}
                          </span>
                          {rental.discount > 0 && (
                            <span className="text-green-600 text-xs ml-2">
                              (réd. {rental.discount.toLocaleString()} {CONFIG.currency})
                            </span>
                          )}
                          <p className="text-gray-400 text-xs mt-0.5">📋 {rental.contract_number}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleCancelPendingJet(rental.id)}
                            className="text-red-400 hover:text-red-600 text-sm border border-red-200 px-3 py-2 rounded-xl hover:bg-red-50"
                          >
                            Annuler
                          </button>
                          <button
                            onClick={() => setAssigningRental(rental)}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl font-bold text-sm transition-colors"
                          >
                            ▶️ Attribuer & Démarrer
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Section : Locations actives ── */}
          {rentals.length > 0 && (
            <div className="grid gap-4 mb-6">
              {rentals.map(rental => {
                const isOverdue = rental.end_time ? new Date(rental.end_time) < new Date() : false
                const waitersForJet = rental.jet_ski_id
                  ? waiting.filter(w => w.jet_ski_id === rental.jet_ski_id)
                  : []

                const cartItems = rental.cart_items ?? []
                const activityDisplay = cartItems.length > 0
                  ? cartItems.map(item => {
                      let s = item.activity.name
                      if (item.subtype) s += ` — ${item.subtype}`
                      if (item.numberOfPersons && item.numberOfPersons > 1) s += ` (${item.numberOfPersons}p)`
                      return s
                    }).join(' + ')
                  : rental.activity_name

                return (
                  <div
                    key={rental.id}
                    className={`bg-white rounded-2xl shadow-sm border-2 p-5 ${
                      isOverdue ? 'border-red-300' : 'border-gray-100'
                    }`}
                  >
                    {isOverdue && (
                      <div className="bg-red-50 text-red-600 text-xs font-semibold px-3 py-1 rounded-lg mb-3 inline-block">
                        ⚠️ Dépassement horaire
                      </div>
                    )}

                    {waitersForJet.length > 0 && (
                      <div className="bg-orange-50 text-orange-700 text-xs font-semibold px-3 py-1.5 rounded-lg mb-3 flex items-center gap-2">
                        <span>⏳</span>
                        <span>{waitersForJet.length} personne(s) en attente pour ce jet</span>
                      </div>
                    )}

                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-gray-800 text-lg">
                          {rental.client_firstname} {rental.client_name}
                        </h3>
                        <p className="text-gray-500 text-sm">{rental.client_phone}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        isOverdue ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                      }`}>
                        {isOverdue ? '🔴 En retard' : '🟠 En cours'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-blue-50 rounded-xl p-3">
                        <p className="text-xs text-blue-500 font-medium mb-1">ACTIVITÉ</p>
                        <p className="font-bold text-blue-800 text-sm">{activityDisplay}</p>
                        {rental.jet_ski_id && (
                          <p className="text-blue-600 text-sm mt-1">🚤 {rental.jet_ski_id}</p>
                        )}
                        <p className="text-blue-500 text-xs mt-0.5">{rental.duration}</p>
                      </div>

                      <div className={`rounded-xl p-3 ${isOverdue ? 'bg-red-50' : 'bg-green-50'}`}>
                        <p className={`text-xs font-medium mb-1 ${isOverdue ? 'text-red-500' : 'text-green-500'}`}>
                          HORAIRES
                        </p>
                        <p className={`font-bold ${isOverdue ? 'text-red-800' : 'text-green-800'}`}>
                          {rental.start_time ? fmt(rental.start_time) : '--:--'} → {rental.end_time ? fmt(rental.end_time) : '--:--'}
                        </p>
                        <p className={`text-xs mt-1 ${isOverdue ? 'text-red-600' : 'text-green-600'}`}>
                          Retour à {rental.end_time ? fmt(rental.end_time) : '--:--'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold text-2xl text-gray-800">
                          {rental.price.toLocaleString()} {CONFIG.currency}
                        </span>
                        <span className="text-gray-400 text-sm ml-2">· {rental.payment_method}</span>
                        {rental.discount > 0 && (
                          <span className="text-green-600 text-xs ml-2">
                            (réd. {rental.discount.toLocaleString()} {CONFIG.currency})
                          </span>
                        )}
                        <p className="text-gray-400 text-xs mt-0.5">📋 {rental.contract_number}</p>
                      </div>
                      <button
                        onClick={() => handleReturn(rental)}
                        className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-xl font-bold transition-colors shadow text-sm"
                      >
                        ✅ Rendu
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* ── Section : File d'attente ── */}
          {waiting.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-gray-700 mb-3 flex items-center gap-2">
                <span>⏳</span> File d'attente ({waiting.length})
              </h3>
              <div className="space-y-3">
                {waiting.map((entry, i) => (
                  <div key={entry.id} className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="bg-orange-500 text-white font-bold w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0">
                          {i + 1}
                        </div>
                        <div>
                          <p className="font-bold text-orange-900">
                            {entry.client_firstname} {entry.client_name}
                          </p>
                          <p className="text-orange-600 text-sm">{entry.client_phone}</p>
                          <div className="flex gap-2 mt-1 flex-wrap">
                            <span className="bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded-lg">
                              🚤 Attend {entry.jet_ski_id}
                            </span>
                            <span className="bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded-lg">
                              {entry.activity_name}
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleCancelWaiting(entry.id)}
                        className="text-gray-400 hover:text-red-500 text-xl ml-2 flex-shrink-0"
                        title="Annuler"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
