import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { CONFIG } from '../config'
import { Rental, WaitingEntry } from '../types'

interface Props {
  onNewRental: () => void
  onEditRental: (id: string) => void   // ← NOUVEAU
}

const fmt = (iso: string) =>
  new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })

export default function ActiveRentals({ onNewRental, onEditRental }: Props) {
  const [rentals, setRentals] = useState<Rental[]>([])
  const [waiting, setWaiting] = useState<WaitingEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [returnAlert, setReturnAlert] = useState<{ jetId: string; waiters: WaitingEntry[] } | null>(null)

  const fetchAll = useCallback(async () => {
    const [rentalsRes, waitingRes] = await Promise.all([
      supabase
        .from('rentals')
        .select('*')
        .eq('status', 'active')
        .order('start_time', { ascending: true }),
      supabase
        .from('waiting_list')
        .select('*')
        .eq('status', 'waiting')
        .order('created_at', { ascending: true }),
    ])
    setRentals(rentalsRes.data || [])
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
      // Support multi-jets
      const jetIds = rental.jet_ski_id.split(',').map(s => s.trim())
      const waitersForAnyJet = waiting.filter(w => jetIds.includes(w.jet_ski_id))
      if (waitersForAnyJet.length > 0) {
        // Prend le 1er jet pour l'alerte
        setReturnAlert({ jetId: jetIds[0], waiters: waitersForAnyJet })
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

  // ── Démarrer maintenant depuis la liste d'attente ────────────
  // Vérifie si le jet attendu est libre (non présent dans les locations actives)
  const isJetFree = (jetId: string): boolean => {
    return !rentals.some(r => {
      if (!r.jet_ski_id) return false
      const ids = r.jet_ski_id.split(',').map(s => s.trim())
      return ids.includes(jetId)
    })
  }

  const handleStartFromWaiting = async (entry: WaitingEntry) => {
    if (!isJetFree(entry.jet_ski_id)) {
      alert(`⛔ Le jet ${entry.jet_ski_id} est encore sorti. Il doit être rendu avant de démarrer.`)
      return
    }
    await supabase.from('waiting_list').update({ status: 'converted' }).eq('id', entry.id)
    fetchAll()
    onNewRental()
  }

  if (loading) {
    return <div className="text-center py-16 text-gray-400">⏳ Chargement...</div>
  }

  return (
    <div>
      {/* ── Modal alerte retour ────────────────────────────── */}
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
                  <p className="text-orange-500 text-xs">{waiter.activity_name} · {waiter.activity_subtype || ''}</p>
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

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Locations actives</h2>
          <p className="text-gray-500 text-sm mt-1">
            {fmtDate(new Date().toISOString())} · {rentals.length} en cours
            {waiting.length > 0 && (
              <span className="ml-2 text-orange-600 font-medium">· {waiting.length} en attente</span>
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

      {/* ── Locations actives ──────────────────────────────── */}
      {rentals.length === 0 && waiting.length === 0 ? (
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
          <div className="grid gap-4 mb-6">
            {rentals.map(rental => {
              const isOverdue = new Date(rental.end_time) < new Date()
              const jetIds = rental.jet_ski_id
                ? rental.jet_ski_id.split(',').map(s => s.trim())
                : []
              const waitersForJet = jetIds.length > 0
                ? waiting.filter(w => jetIds.includes(w.jet_ski_id))
                : []

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
                    <div className="flex items-center gap-2">
                      {/* Bouton Modifier */}
                      <button
                        onClick={() => onEditRental(rental.id)}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors"
                        title="Modifier cette location"
                      >
                        ✏️ Modifier
                      </button>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        isOverdue ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                      }`}>
                        {isOverdue ? '🔴 En retard' : '🟡 En cours'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-blue-50 rounded-xl p-3">
                      <p className="text-xs text-blue-500 font-medium mb-1">ACTIVITÉ</p>
                      <p className="font-bold text-blue-800">
                        {rental.activity_name}
                        {rental.activity_subtype ? ` — ${rental.activity_subtype}` : ''}
                      </p>
                      {rental.jet_ski_id && (
                        <p className="text-blue-600 text-sm mt-1">
                          🚤 {rental.jet_ski_id.split(',').join(' + ')}
                        </p>
                      )}
                      <p className="text-blue-500 text-xs">{rental.duration}</p>
                    </div>

                    <div className={`rounded-xl p-3 ${isOverdue ? 'bg-red-50' : 'bg-green-50'}`}>
                      <p className={`text-xs font-medium mb-1 ${isOverdue ? 'text-red-500' : 'text-green-500'}`}>
                        HORAIRES
                      </p>
                      <p className={`font-bold ${isOverdue ? 'text-red-800' : 'text-green-800'}`}>
                        {fmt(rental.start_time)} → {fmt(rental.end_time)}
                      </p>
                      <p className={`text-xs mt-1 ${isOverdue ? 'text-red-600' : 'text-green-600'}`}>
                        Retour à {fmt(rental.end_time)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-2xl text-gray-800">
                        {rental.price.toLocaleString()} {CONFIG.currency}
                      </span>
                      <span className="text-gray-400 text-sm ml-2">· {rental.payment_method}</span>
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

          {/* ── File d'attente ──────────────────────────────── */}
          {waiting.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-gray-700 mb-3 flex items-center gap-2">
                <span>⏳</span> File d'attente ({waiting.length})
              </h3>
              <div className="space-y-3">
                {waiting.map((entry, i) => {
                  const jetFree = isJetFree(entry.jet_ski_id)

                  return (
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
                              <span className={`text-xs px-2 py-0.5 rounded-lg font-medium ${
                                jetFree
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-orange-100 text-orange-700'
                              }`}>
                                {jetFree ? '🟢' : '🔴'} {entry.jet_ski_id}
                              </span>
                              <span className="bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded-lg">
                                {entry.activity_name}
                                {entry.activity_subtype ? ` — ${entry.activity_subtype}` : ''}
                              </span>
                              <span className="bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded-lg">
                                Ajouté à {fmt(entry.created_at)}
                              </span>
                            </div>

                            {/* ── Bouton "Démarrer maintenant" ── */}
                            <div className="mt-2">
                              <button
                                onClick={() => handleStartFromWaiting(entry)}
                                disabled={!jetFree}
                                title={
                                  jetFree
                                    ? 'Le jet est libre, démarrer la location'
                                    : `Le jet ${entry.jet_ski_id} est encore sorti`
                                }
                                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                                  jetFree
                                    ? 'bg-green-500 hover:bg-green-600 text-white shadow-sm'
                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                }`}
                              >
                                {jetFree ? '🚀 Démarrer maintenant' : '⏸️ Jet encore sorti'}
                              </button>
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
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
