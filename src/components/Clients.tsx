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
  idPhotoPath: string | null
  totalCA: number
  visits: number
  lastVisit: string
  activities: string[]
  rentals: Rental[]   // ← Toutes les locations pour l'accordéon
}

// ── Lien photo signé (1h) ──────────────────────────────────
const openIdPhotoSecure = async (filePath: string, clientName: string) => {
  const { data, error } = await supabase.storage
    .from('id-photos')
    .createSignedUrl(filePath, 3600)
  if (error || !data?.signedUrl) {
    alert('❌ Impossible de charger la photo.')
    return
  }
  const url = data.signedUrl
  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Pièce d'identité — ${clientName}</title>
  <style>
    body { margin: 0; background: #111; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; font-family: Arial, sans-serif; }
    .bar { position: fixed; top: 0; left: 0; right: 0; background: #1e40af; padding: 12px 20px; display: flex; align-items: center; justify-content: space-between; z-index: 10; }
    .bar-left span { color: white; font-weight: 600; font-size: 14px; }
    .bar-left small { color: #93c5fd; font-size: 11px; display: block; }
    .btn { background: white; color: #1e40af; border: none; padding: 8px 18px; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer; text-decoration: none; }
    img { max-width: 95vw; max-height: 85vh; border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.6); margin-top: 70px; }
  </style>
</head>
<body>
  <div class="bar">
    <div class="bar-left">
      <span>🪪 Pièce d'identité — ${clientName}</span>
      <small>🔒 Lien sécurisé · expire dans 1 heure</small>
    </div>
    <a class="btn" href="${url}" download="CIN-${clientName.replace(/ /g, '-')}.jpg">⬇️ Télécharger</a>
  </div>
  <img src="${url}" alt="Pièce d'identité de ${clientName}" />
</body>
</html>`
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const blobUrl = URL.createObjectURL(blob)
  const win = window.open(blobUrl, '_blank')
  if (win) win.onload = () => setTimeout(() => URL.revokeObjectURL(blobUrl), 1000)
}

// ── Formatage date ─────────────────────────────────────────
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })

const fmtTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '--:--'

export default function Clients() {
  const [clients, setClients] = useState<ClientSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [openClientKey, setOpenClientKey] = useState<string | null>(null)

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('rentals')
        .select('*')
        .order('created_at', { ascending: false })

      if (data) {
        const map = new Map<string, ClientSummary>()

        data.forEach((r: Rental) => {
          // Clé : téléphone (ou nom si pas de tel)
          const key = r.client_phone?.replace(/\s/g, '') || `${r.client_name}-${r.client_firstname}`

          if (map.has(key)) {
            const c = map.get(key)!
            c.totalCA += r.price
            c.visits += 1
            if (r.created_at > c.lastVisit) {
              c.lastVisit = r.created_at
              if (r.id_photo_url) c.idPhotoPath = r.id_photo_url
            }
            if (!c.activities.includes(r.activity_name)) c.activities.push(r.activity_name)
            c.rentals.push(r)
          } else {
            map.set(key, {
              key,
              name: r.client_name,
              firstname: r.client_firstname,
              phone: r.client_phone,
              idNumber: r.client_id_number,
              idPhotoPath: r.id_photo_url || null,
              totalCA: r.price,
              visits: 1,
              lastVisit: r.created_at,
              activities: [r.activity_name],
              rentals: [r],
            })
          }
        })

        // Trier les rentals de chaque client par date décroissante
        map.forEach(c => {
          c.rentals.sort((a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )
        })

        setClients(
          Array.from(map.values()).sort((a, b) => b.totalCA - a.totalCA)
        )
      }
      setLoading(false)
    }
    fetch()
  }, [])

  const filtered = clients.filter(c =>
    !search ||
    `${c.firstname} ${c.name}`.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  )

  const totalCA = filtered.reduce((sum, c) => sum + c.totalCA, 0)

  if (loading) return <div className="text-center py-16 text-gray-400">⏳ Chargement...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Fichier clients</h2>
          <p className="text-gray-500 text-sm mt-1">{clients.length} client(s) unique(s)</p>
        </div>
      </div>

      <input
        type="text"
        placeholder="🔍 Rechercher un client..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full border border-gray-300 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 mb-4 text-sm"
      />

      <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-4 flex justify-between">
        <span className="text-blue-700 text-sm font-medium">{filtered.length} client(s)</span>
        <span className="text-blue-800 font-bold">
          CA total : {totalCA.toLocaleString()} {CONFIG.currency}
        </span>
      </div>

      <div className="space-y-3">
        {filtered.map((client, i) => {
          const isOpen = openClientKey === client.key

          return (
            <div key={client.key} className="bg-white rounded-xl border overflow-hidden hover:shadow-sm transition-shadow">

              {/* ── En-tête client ── */}
              <div className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 font-mono">#{i + 1}</span>
                      <p className="font-semibold text-gray-800">
                        {client.firstname} {client.name}
                      </p>
                    </div>
                    {client.phone && <p className="text-gray-500 text-sm mt-0.5">{client.phone}</p>}
                    {client.idNumber && (
                      <p className="text-gray-400 text-xs mt-0.5">🪪 {client.idNumber}</p>
                    )}
                    <p className="text-gray-400 text-xs mt-1">
                      {client.visits} visite(s) · Dernière : {fmtDate(client.lastVisit)}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {client.activities.map(act => (
                        <span key={act} className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                          {act}
                        </span>
                      ))}
                    </div>

                    {/* Bouton photo CIN */}
                    {client.idPhotoPath && (
                      <div className="mt-2">
                        <button
                          onClick={() => openIdPhotoSecure(client.idPhotoPath!, `${client.firstname} ${client.name}`)}
                          className="flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors border border-indigo-200"
                        >
                          🪪 Voir la pièce d'identité 🔒
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="text-right ml-4 flex-shrink-0">
                    <p className="font-bold text-gray-800 text-xl">
                      {client.totalCA.toLocaleString()}
                    </p>
                    <p className="text-gray-500 text-xs">{CONFIG.currency} CA</p>
                  </div>
                </div>

                {/* Bouton accordéon contrats */}
                <button
                  onClick={() => setOpenClientKey(isOpen ? null : client.key)}
                  className="mt-3 w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 rounded-xl text-sm font-semibold text-gray-700 transition-colors border border-gray-200"
                >
                  <span>
                    📋 {client.visits} contrat{client.visits > 1 ? 's' : ''}
                  </span>
                  <span className="text-gray-400 text-lg">{isOpen ? '▲' : '▼'}</span>
                </button>
              </div>

              {/* ── Liste des contrats (accordéon) ── */}
              {isOpen && (
                <div className="border-t border-gray-100 bg-gray-50 px-4 pb-4">
                  <div className="space-y-3 pt-3">
                    {client.rentals.map((rental, ri) => (
                      <div
                        key={rental.id}
                        className="bg-white rounded-xl border border-gray-200 p-3"
                      >
                        {/* Ligne du haut : date + montant */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span className="bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-full">
                              #{ri + 1}
                            </span>
                            <span>📅 {fmtDate(rental.created_at)}</span>
                            {rental.start_time && (
                              <span>⏱️ {fmtTime(rental.start_time)} → {fmtTime(rental.end_time)}</span>
                            )}
                          </div>
                          <span className="font-bold text-gray-800">
                            {rental.price.toLocaleString()} {CONFIG.currency}
                          </span>
                        </div>

                        {/* Activité + paiement */}
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-lg font-medium">
                            🚤 {rental.activity_name}
                            {rental.activity_subtype ? ` — ${rental.activity_subtype}` : ''}
                          </span>
                          <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-lg">
                            {rental.payment_method}
                          </span>
                          {rental.jet_ski_id && (
                            <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-lg">
                              🚤 {rental.jet_ski_id}
                            </span>
                          )}
                          <span className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-lg">
                            📋 {rental.contract_number}
                          </span>
                        </div>

                        {/* Bouton télécharger contrat */}
                        <button
                          onClick={() => openContractPDF(rental)}
                          className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors border border-blue-200 w-full justify-center"
                        >
                          📄 Télécharger le contrat
                        </button>
                      </div>
                    ))}
                  </div>
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
