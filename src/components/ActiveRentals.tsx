import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { CONFIG } from '../config'
import { Rental, WaitingEntry, CartItem } from '../types'

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

// ─── Panel attribution jet ski ───────────────────────────────
interface AssignPanelProps {
  rental: Rental
  onConfirm: () => void
  onCancel: () => void
}

function AssignJetPanel({ rental, onConfirm, onCancel }: AssignPanelProps) {
  const [selectedJet, setSelectedJet] = useState('')
  const [startTime, setStartTime] = useState(formatForInput(new Date()))
  const [submitting, setSubmitting] = useState(false)
  const [rentalMap, setRentalMap] = useState<Record<string, { endTime: string }>>({})

  const cartItems = rental.cart_items ?? []
  const jetItem = cartItems.find(item => item.activity.requiresJetSki)
  const jetType = jetItem?.activity.jetType ?? 'VX'
  const jets = CONFIG.jetSkis.filter(j => j.type === jetType)
  const durationMinutes = jetItem?.activity.durationMinutes ?? rental.duration_minutes ?? 30

  useEffect(() => {
    supabase.from('rentals').select('jet_ski_id, end_time').eq('status', 'active').not('jet_ski_id', 'is', null)
      .then(({ data }) => {
        const map: Record<string, { endTime: string }> = {}
        data?.forEach(r => { if (r.jet_ski_id) map[r.jet_ski_id] = { endTime: r.end_time } })
        setRentalMap(map)
      })
  }, [])

  const endTimeDate = new Date(new Date(startTime).getTime() + durationMinutes * 60000)
  const endTimeISO = endTimeDate.toISOString()
  const endTimeDisplay = endTimeDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

  const handleConfirm = async () => {
    if (!selectedJet) return
    setSubmitting(true)
    try {
      const { error } = await supabase.from('rentals').update({
        jet_ski_id: selectedJet,
        start_time: new Date(startTime).toISOString(),
        end_time: endTimeISO,
        status: 'active',
      }).eq('id', rental.id)
      if (error) throw error
      onConfirm()
    } catch (err) { console.error(err); alert('❌ Erreur lors de l\'attribution.') }
    setSubmitting(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
        <h3 className="text-lg font-bold text-gray-800 mb-1">🚤 Attribuer un jet ski</h3>
        <p className="text-gray-500 text-sm mb-4">{rental.client_firstname} {rental.client_name}</p>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {jets.map(jet => {
            const isOccupied = !!rentalMap[jet.id]
            return (
              <button key={jet.id} onClick={() => !isOccupied && setSelectedJet(jet.id)} disabled={isOccupied}
                className={`p-3 rounded-xl border-2 text-center font-bold text-sm transition-all ${
                  isOccupied ? 'border-red-200 bg-red-50 text-red-400 cursor-not-allowed'
                    : selectedJet === jet.id ? 'border-green-500 bg-green-50 text-green-800 ring-2 ring-green-300'
                    : 'border-gray-200 bg-white text-gray-800 hover:border-green-400'
                }`}>
                <div className="text-2xl mb-1">🚤</div>
                <div>{jet.name}</div>
                <div className={`text-xs mt-0.5 ${isOccupied ? 'text-red-400' : 'text-green-500'}`}>
                  {isOccupied ? `Retour ${fmt(rentalMap[jet.id].endTime)}` : 'Disponible'}
                </div>
              </button>
            )
          })}
        </div>
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-1">🕐 Heure de départ</label>
          <input type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        {selectedJet && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4 text-sm">
            <p className="text-green-800 font-medium">🚤 {selectedJet} · Départ {fmt(startTime)} → Retour {endTimeDisplay}</p>
          </div>
        )}
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-200">Annuler</button>
          <button onClick={handleConfirm} disabled={!selectedJet || submitting}
            className="flex-1 bg-green-600 text-white py-2.5 rounded-xl text-sm font-bold disabled:opacity-40 hover:bg-green-700">
            {submitting ? '...' : '▶️ Démarrer'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Composant principal ─────────────────────────────────────
export default function ActiveRentals({ onNewRental }: Props) {
  const [rentals, setRentals] = useState<Rental[]>([])
  const [pendingJetRentals, setPendingJetRentals] = useState<Rental[]>([])
  const [waiting, setWaiting] = useState<WaitingEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [returnAlert, setReturnAlert] = useState<{ jetId: string; waiters: WaitingEntry[] } | null>(null)
  const [assigningRental, setAssigningRental] = useState<Rental | null>(null)

  const fetchAll = useCallback(async () => {
    const [activeRes, pendingRes, waitingRes] = await Promise.all([
      supabase.from('rentals').select('*').eq('status', 'active').order('start_time', { ascending: true }),
      supabase.from('rentals').select('*').eq('status', 'pending_jet').order('created_at', { ascending: true }),
      supabase.from('waiting_list').select('*').eq('status', 'waiting').order('created_at', { ascending: true }),
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

  // ── Rendre une activité spécifique du panier ───────────────
  const handleReturnItem = async (rental: Rental, cartId: string) => {
    const currentReturned: string[] = Array.isArray(rental.returned_cart_ids)
      ? (rental.returned_cart_ids as string[])
      : []
    const newReturned = [...currentReturned, cartId]
    const allCartIds = (rental.cart_items ?? []).map(item => item.cartId)
    const allReturned = allCartIds.length > 0 && allCartIds.every(id => newReturned.includes(id))

    if (allReturned) {
      // Toutes les activités rendues → archiver
      await supabase.from('rentals').update({ status: 'archived', returned_cart_ids: newReturned }).eq('id', rental.id)

      // Vérifier file d'attente pour ce jet
      if (rental.jet_ski_id) {
        const waiters = waiting.filter(w => w.jet_ski_id === rental.jet_ski_id)
        if (waiters.length > 0) setReturnAlert({ jetId: rental.jet_ski_id, waiters })
      }
    } else {
      // Activité partielle rendue
      await supabase.from('rentals').update({ returned_cart_ids: newReturned }).eq('id', rental.id)
    }
    fetchAll()
  }

  // ── Rendu global (pour locations sans cart_items) ──────────
  const handleReturn = async (rental: Rental) => {
    if (!confirm(`Confirmer le retour de ${rental.client_firstname} ${rental.client_name} ?`)) return
    await supabase.from('rentals').update({ status: 'archived' }).eq('id', rental.id)
    if (rental.jet_ski_id) {
      const waiters = waiting.filter(w => w.jet_ski_id === rental.jet_ski_id)
      if (waiters.length > 0) setReturnAlert({ jetId: rental.jet_ski_id, waiters })
    }
    fetchAll()
  }

  const handleCancelWaiting = async (id: string) => {
    await supabase.from('waiting_list').update({ status: 'cancelled' }).eq('id', id)
    fetchAll()
  }

  const handleConvertWaiting = async (entry: WaitingEntry) => {
    await supabase.from('waiting_list').update({ status: 'converted' }).eq('id', entry.id)
    setReturnAlert(null)
    onNewRental()
  }

  const handleCancelPendingJet = async (id: string) => {
    if (!confirm('Annuler cette location ?')) return
    await supabase.from('rentals').update({ status: 'archived' }).eq('id', id)
    fetchAll()
  }

  if (loading) return <div className="text-center py-16 text-gray-400">⏳ Chargement...</div>

  const hasAnything = rentals.length > 0 || pendingJetRentals.length > 0 || waiting.length > 0

  return (
    <div>
      {assigningRental && (
        <AssignJetPanel rental={assigningRental} onConfirm={() => { setAssigningRental(null); fetchAll() }} onCancel={() => setAssigningRental(null)} />
      )}

      {returnAlert && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <div className="text-center mb-4">
              <div className="text-5xl mb-3">🔔</div>
              <h3 className="text-xl font-bold text-orange-700">File d'attente !</h3>
              <p className="text-gray-600 text-sm mt-1">Le jet <strong>{returnAlert.jetId}</strong> vient d'être rendu.</p>
            </div>
            <div className="space-y-3 mb-5">
              {returnAlert.waiters.map((waiter, i) => (
                <div key={waiter.id} className="bg-orange-50 border border-orange-200 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-orange-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">{i + 1}</span>
                    <p className="font-bold text-orange-800">{waiter.client_firstname} {waiter.client_name}</p>
                  </div>
                  <p className="text-orange-600 text-sm">{waiter.client_phone}</p>
                  {i === 0 && (
                    <button onClick={() => handleConvertWaiting(waiter)} className="w-full mt-2 bg-green-500 text-white py-2 rounded-xl text-sm font-bold hover:bg-green-600">
                      ➕ Démarrer sa location
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button onClick={() => setReturnAlert(null)} className="w-full bg-gray-100 text-gray-700 py-2.5 rounded-xl font-medium">Fermer</button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Locations actives</h2>
          <p className="text-gray-500 text-sm mt-1">
            {fmtDate(new Date().toISOString())} · {rentals.length} en cours
            {pendingJetRentals.length > 0 && <span className="ml-2 text-yellow-600 font-medium">· {pendingJetRentals.length} en attente de jet</span>}
            {waiting.length > 0 && <span className="ml-2 text-orange-600 font-medium">· {waiting.length} en file d'attente</span>}
          </p>
        </div>
        <button onClick={onNewRental} className="bg-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-blue-800 shadow">
          ➕ Nouvelle
        </button>
      </div>

      {!hasAnything ? (
        <div className="text-center py-20">
          <div className="text-7xl mb-4">🌊</div>
          <p className="text-xl text-gray-500 font-medium">Aucune location en cours</p>
          <button onClick={onNewRental} className="mt-6 bg-blue-700 text-white px-8 py-3 rounded-xl font-semibold hover:bg-blue-800">
            ➕ Démarrer une location
          </button>
        </div>
      ) : (
        <>
          {/* ── En attente de jet ski ── */}
          {pendingJetRentals.length > 0 && (
            <div className="mb-6">
              <h3 className="text-base font-bold text-yellow-700 mb-3">🟡 En attente de jet ski ({pendingJetRentals.length})</h3>
              <div className="space-y-3">
                {pendingJetRentals.map(rental => {
                  const activities = (rental.cart_items ?? []).map(item => {
                    let s = item.activity.name
                    if (item.subtype) s += ` — ${item.subtype}`
                    if (item.numberOfPersons && item.numberOfPersons > 1) s += ` (${item.numberOfPersons}p)`
                    return s
                  }).join(' + ') || rental.activity_name
                  return (
                    <div key={rental.id} className="bg-white border-2 border-yellow-300 rounded-2xl p-4 shadow-sm">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-bold text-gray-800 text-lg">{rental.client_firstname} {rental.client_name}</h4>
                          <p className="text-gray-500 text-sm">{rental.client_phone}</p>
                        </div>
                        <span className="bg-yellow-100 text-yellow-700 text-xs font-bold px-3 py-1 rounded-full">🟡 En attente</span>
                      </div>
                      <div className="bg-yellow-50 rounded-xl p-3 mb-3">
                        <p className="text-gray-600 text-sm font-medium">{activities}</p>
                        <p className="text-yellow-700 text-xs mt-1">Paiement : {rental.payment_method}</p>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xl text-gray-800">{rental.price.toLocaleString()} {CONFIG.currency}</span>
                        <div className="flex gap-2">
                          <button onClick={() => handleCancelPendingJet(rental.id)} className="text-red-400 border border-red-200 px-3 py-2 rounded-xl text-sm hover:bg-red-50">Annuler</button>
                          <button onClick={() => setAssigningRental(rental)} className="bg-green-600 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-green-700">▶️ Attribuer & Démarrer</button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Locations actives ── */}
          {rentals.length > 0 && (
            <div className="grid gap-4 mb-6">
              {rentals.map(rental => {
                const isOverdue = rental.end_time ? new Date(rental.end_time) < new Date() : false
                const cartItems: CartItem[] = rental.cart_items ?? []
                const returnedIds: string[] = Array.isArray(rental.returned_cart_ids)
                  ? (rental.returned_cart_ids as string[])
                  : []
                const hasCart = cartItems.length > 0

                return (
                  <div key={rental.id} className={`bg-white rounded-2xl shadow-sm border-2 p-5 ${isOverdue ? 'border-red-300' : 'border-gray-100'}`}>
                    {isOverdue && (
                      <div className="bg-red-50 text-red-600 text-xs font-semibold px-3 py-1 rounded-lg mb-3 inline-block">⚠️ Dépassement horaire</div>
                    )}

                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-gray-800 text-lg">{rental.client_firstname} {rental.client_name}</h3>
                        <p className="text-gray-500 text-sm">{rental.client_phone}</p>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-xl text-gray-800">{rental.price.toLocaleString()} {CONFIG.currency}</span>
                        <p className="text-gray-400 text-xs">{rental.payment_method}</p>
                        {rental.discount > 0 && <p className="text-green-600 text-xs">réd. -{rental.discount.toLocaleString()}</p>}
                      </div>
                    </div>

                    {/* Horaires */}
                    <div className={`rounded-xl p-3 mb-3 ${isOverdue ? 'bg-red-50' : 'bg-blue-50'}`}>
                      <div className="flex justify-between items-center">
                        <span className={`text-sm font-semibold ${isOverdue ? 'text-red-700' : 'text-blue-700'}`}>
                          🕐 {rental.start_time ? fmt(rental.start_time) : '--:--'} → {rental.end_time ? fmt(rental.end_time) : '--:--'}
                        </span>
                        {rental.jet_ski_id && (
                          <span className="text-blue-600 text-sm font-medium">🚤 {rental.jet_ski_id}</span>
                        )}
                      </div>
                      <p className="text-gray-400 text-xs mt-0.5">📋 {rental.contract_number}</p>
                    </div>

                    {/* ── Activités par activité ── */}
                    {hasCart ? (
                      <div className="space-y-2 mb-2">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Activités</p>
                        {cartItems.map(item => {
                          const isItemReturned = returnedIds.includes(item.cartId)
                          return (
                            <div
                              key={item.cartId}
                              className={`flex items-center justify-between rounded-xl px-3 py-2.5 border ${
                                isItemReturned
                                  ? 'bg-gray-50 border-gray-200 opacity-60'
                                  : 'bg-white border-blue-100'
                              }`}
                            >
                              <div>
                                <p className={`font-medium text-sm ${isItemReturned ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                                  {item.activity.name}
                                  {item.subtype && ` — ${item.subtype}`}
                                  {item.numberOfPersons && item.numberOfPersons > 1 && ` (${item.numberOfPersons}p)`}
                                </p>
                                <p className="text-gray-400 text-xs">{item.activity.duration} · {item.itemPrice.toLocaleString()} {CONFIG.currency}</p>
                              </div>
                              {isItemReturned ? (
                                <span className="text-green-600 text-xs font-bold bg-green-50 px-2 py-1 rounded-lg">✅ Rendu</span>
                              ) : (
                                <button
                                  onClick={() => handleReturnItem(rental, item.cartId)}
                                  className="bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                                >
                                  ✅ Rendu
                                </button>
                              )}
                            </div>
                          )
                        })}
                        {/* Message si tout est rendu */}
                        {returnedIds.length > 0 && returnedIds.length < cartItems.length && (
                          <p className="text-orange-600 text-xs text-center mt-1">
                            {returnedIds.length}/{cartItems.length} activités rendues
                          </p>
                        )}
                      </div>
                    ) : (
                      /* Ancienne location sans panier : bouton global */
                      <button
                        onClick={() => handleReturn(rental)}
                        className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-bold transition-colors text-sm"
                      >
                        ✅ Tout rendu
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* ── File d'attente ── */}
          {waiting.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-gray-700 mb-3">⏳ File d'attente ({waiting.length})</h3>
              <div className="space-y-3">
                {waiting.map((entry, i) => (
                  <div key={entry.id} className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="bg-orange-500 text-white font-bold w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0">{i + 1}</div>
                        <div>
                          <p className="font-bold text-orange-900">{entry.client_firstname} {entry.client_name}</p>
                          <p className="text-orange-600 text-sm">{entry.client_phone}</p>
                          <div className="flex gap-2 mt-1">
                            <span className="bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded-lg">🚤 Attend {entry.jet_ski_id}</span>
                          </div>
                        </div>
                      </div>
                      <button onClick={() => handleCancelWaiting(entry.id)} className="text-gray-400 hover:text-red-500 text-xl ml-2">✕</button>
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
