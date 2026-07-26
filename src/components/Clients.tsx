import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { CONFIG } from '../config'
import { Rental } from '../types'
import { openContractPDF } from '../utils/contractHTML'

interface ClientSummary {
  key: string
  name: string
  firstname: string
  phone: string
  idNumber: string
  totalCA: number
  visits: number
  lastVisit: string
  activities: string[]
}

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '--'

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })

export default function Clients() {
  const [clients, setClients]           = useState<ClientSummary[]>([])
  const [loading, setLoading]           = useState(true)
  const [search, setSearch]             = useState('')

  // Gestion de l'accordéon : clientKey → rentals chargés
  const [expandedKey, setExpandedKey]         = useState<string | null>(null)
  const [clientRentals, setClientRentals]     = useState<Rental[]>([])
  const [loadingRentals, setLoadingRentals]   = useState(false)

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('rentals')
        .select('client_name, client_firstname, client_phone, client_id_number, price, created_at, activity_name')
        .order('created_at', { ascending: false })

      if (data) {
        const map = new Map<string, ClientSummary>()
        data.forEach(r => {
          const key = (r.client_id_number || r.client_phone).replace(/\s/g, '')
          if (map.has(key)) {
            const c = map.get(key)!
            c.totalCA += r.price
            c.visits  += 1
            if (r.created_at > c.lastVisit) c.lastVisit = r.created_at
            if (!c.activities.includes(r.activity_name)) c.activities.push(r.activity_name)
          } else {
            map.set(key, {
              key,
              name:       r.client_name,
              firstname:  r.client_firstname,
              phone:      r.client_phone,
              idNumber:   r.client_id_number,
              totalCA:    r.price,
              visits:     1,
              lastVisit:  r.created_at,
              activities: [r.activity_name],
            })
          }
        })
        setClients(Array.from(map.values()).sort((a, b) => b.totalCA - a.totalCA))
      }
      setLoading(false)
    }
    fetch()
  }, [])

  // ── Ouvrir / fermer l'historique d'un client ────────────────
  const handleToggleClient = async (client: ClientSummary) => {
    if (expandedKey === client.key) {
      setExpandedKey(null)
      setClientRentals([])
      return
    }

    setExpandedKey(client.key)
    setLoadingRentals(true)

    // Chercher toutes ses locations (par téléphone ou N° pièce)
    const { data } = await supabase
      .from('rentals')
      .select('*')
      .or(`client_phone.eq.${client.phone},client_id_number.eq.${client.idNumber}`)
      .order('created_at', { ascending: false })

    setClientRentals(data || [])
    setLoadingRentals(false)
  }

  const filtered = clients.filter(c =>
    !search ||
    `${c.firstname} ${c.name}`.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  )

  const totalCA = filtered.reduce((sum, c) => sum + c.totalCA, 0)

  if (loading) return <div className="text-center py-16 text-gray-400">⏳ Chargement...</div>

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Fichier clients</h2>
          <p className="text-gray-500 text-sm mt-1">{clients.length} client(s) unique(s)</p>
        </div>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="🔍 Rechercher un client..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full border border-gray-300 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 mb-4 text-sm"
      />

      {/* Summary bar */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-4 flex justify-between">
        <span className="text-blue-700 text-sm font-medium">{filtered.length} client(s)</span>
        <span className="text-blue-800 font-bold">
          CA total : {totalCA.toLocaleString()} {CONFIG.currency}
        </span>
      </div>

      {/* Clients list */}
      <div className="space-y-3">
        {filtered.map((client, i) => {
          const isExpanded = expandedKey === client.key
          return (
            <div key={client.key} className="bg-white rounded-2xl border overflow-hidden shadow-sm">

              {/* ── Fiche client ── */}
              <div className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 font-mono">#{i + 1}</span>
                      <p className="font-semibold text-gray-800">
                        {client.firstname} {client.name}
                      </p>
                    </div>
                    <p className="text-gray-500 text-sm mt-0.5">{client.phone}</p>
                    <p className="text-gray-400 text-xs mt-1">
                      {client.visits} location(s) · Dernière : {new Date(client.lastVisit).toLocaleDateString('fr-FR')}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {client.activities.map(act => (
                        <span key={act} className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                          {act}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="font-bold text-gray-800 text-xl">
                      {client.totalCA.toLocaleString()}
                    </p>
                    <p className="text-gray-500 text-xs">{CONFIG.currency} CA</p>
                  </div>
                </div>

                {/* Bouton voir contrats */}
                <button
                  onClick={() => handleToggleClient(client)}
                  className={`mt-3 flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                    isExpanded
                      ? 'bg-blue-700 text-white border-blue-700'
                      : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                  }`}
                >
                  📋 {isExpanded ? 'Masquer les contrats' : `Voir les ${client.visits} contrat(s)`}
                  <span className="ml-1">{isExpanded ? '▲' : '▼'}</span>
                </button>
              </div>

              {/* ── Historique des contrats (accordéon) ── */}
              {isExpanded && (
                <div className="border-t border-gray-100 bg-gray-50 p-4">
                  {loadingRentals ? (
                    <p className="text-gray-400 text-sm text-center py-4">⏳ Chargement des contrats...</p>
                  ) : clientRentals.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center py-4">Aucun contrat trouvé</p>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-gray-500 font-semibold mb-2 uppercase tracking-wide">
                        Historique des contrats ({clientRentals.length})
                      </p>
                      {clientRentals.map(rental => (
                        <div
                          key={rental.id}
                          className="bg-white rounded-xl border p-3 flex items-start justify-between gap-3"
                        >
                          {/* Infos location */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                rental.status === 'active'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-gray-100 text-gray-600'
                              }`}>
                                {rental.status === 'active' ? '🟢 Active' : '📁 Archivée'}
                              </span>
                              <span className="text-xs text-gray-500">
                                📅 {fmtDate(rental.created_at)}
                              </span>
                            </div>

                            <p className="font-medium text-gray-800 text-sm mt-1">
                              {rental.activity_name}
                              {rental.activity_subtype ? ` — ${rental.activity_subtype}` : ''}
                            </p>

                            <div className="flex flex-wrap gap-2 mt-1 text-xs text-gray-500">
                              <span>📋 {rental.contract_number}</span>
                              {rental.jet_ski_id && <span>🚤 {rental.jet_ski_id}</span>}
                              {rental.start_time && rental.end_time && (
                                <span>⏱️ {fmt(rental.start_time)} → {fmt(rental.end_time)}</span>
                              )}
                              <span>💳 {rental.payment_method}</span>
                            </div>
                          </div>

                          {/* Prix + bouton PDF */}
                          <div className="flex flex-col items-end gap-2 flex-shrink-0">
                            <span className="font-bold text-gray-800">
                              {rental.price.toLocaleString()} {CONFIG.currency}
                            </span>
                            {rental.signature ? (
                              <button
                                onClick={() => openContractPDF(rental)}
                                className="flex items-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors border border-blue-200"
                              >
                                📄 PDF
                              </button>
                            ) : (
                              <span className="text-gray-300 text-xs">Pas de signature</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <div className="text-5xl mb-3">👤</div>
            <p>Aucun client trouvé</p>
          </div>
        )}
      </div>
    </div>
  )
}
