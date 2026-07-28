import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { CONFIG } from '../config'

interface ClientSummary {
  key: string
  name: string
  firstname: string
  phone: string
  idNumber: string
  totalCA: number
  visits: number
  parkingVisits: number
  lastVisit: string
  activities: string[]
  hasPhone: boolean
}

export default function Clients() {
  const [clients, setClients] = useState<ClientSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // ── Édition ───────────────────────────────────────────────
  const [editingClient, setEditingClient] = useState<ClientSummary | null>(null)
  const [editForm, setEditForm] = useState({ firstname: '', name: '', phone: '' })
  const [saving, setSaving] = useState(false)

  const fetchClients = async () => {
    // Récupère locations ET parkings en parallèle
    const [rentalsRes, parkingsRes] = await Promise.all([
      supabase
        .from('rentals')
        .select('client_name, client_firstname, client_phone, client_id_number, price, created_at, activity_name')
        .order('created_at', { ascending: false }),
      supabase
        .from('parkings')
        .select('client_name, price, created_at, type')
        .order('created_at', { ascending: false }),
    ])

    const map = new Map<string, ClientSummary>()

    // ── Locations (clé = téléphone) ───────────────────────────
    ;(rentalsRes.data || []).forEach(r => {
      const key = 'phone:' + r.client_phone.replace(/\s/g, '')
      if (map.has(key)) {
        const c = map.get(key)!
        c.totalCA += r.price
        c.visits += 1
        if (r.created_at > c.lastVisit) c.lastVisit = r.created_at
        if (!c.activities.includes(r.activity_name)) c.activities.push(r.activity_name)
      } else {
        map.set(key, {
          key,
          name: r.client_name,
          firstname: r.client_firstname,
          phone: r.client_phone,
          idNumber: r.client_id_number,
          totalCA: r.price,
          visits: 1,
          parkingVisits: 0,
          lastVisit: r.created_at,
          activities: [r.activity_name],
          hasPhone: true,
        })
      }
    })

    // ── Parkings (clé = nom normalisé si pas de téléphone) ────
    ;(parkingsRes.data || []).forEach(p => {
      const normalizedName = p.client_name.trim().toUpperCase()

      // Essaie de matcher avec un client existant par nom
      let matchedKey: string | null = null
      for (const [key, client] of map.entries()) {
        if (client.name.toUpperCase() === normalizedName) {
          matchedKey = key
          break
        }
      }

      if (matchedKey) {
        // Client déjà connu via une location → ajoute le CA parking
        const c = map.get(matchedKey)!
        c.totalCA += p.price
        c.parkingVisits += 1
        if (p.created_at > c.lastVisit) c.lastVisit = p.created_at
        if (!c.activities.includes('🅿️ Parking')) c.activities.push('🅿️ Parking')
      } else {
        // Nouveau client parking sans location existante
        const key = 'parking:' + normalizedName
        if (map.has(key)) {
          const c = map.get(key)!
          c.totalCA += p.price
          c.parkingVisits += 1
          if (p.created_at > c.lastVisit) c.lastVisit = p.created_at
        } else {
          map.set(key, {
            key,
            name: normalizedName,
            firstname: '',
            phone: '',
            idNumber: '',
            totalCA: p.price,
            visits: 0,
            parkingVisits: 1,
            lastVisit: p.created_at,
            activities: ['🅿️ Parking'],
            hasPhone: false,
          })
        }
      }
    })

    setClients(Array.from(map.values()).sort((a, b) => b.totalCA - a.totalCA))
    setLoading(false)
  }

  useEffect(() => { fetchClients() }, [])

  const filtered = clients.filter(c =>
    !search ||
    `${c.firstname} ${c.name}`.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  )

  const totalCA = filtered.reduce((sum, c) => sum + c.totalCA, 0)

  // ── Édition ────────────────────────────────────────────────
  const openEdit = (client: ClientSummary) => {
    setEditingClient(client)
    setEditForm({ firstname: client.firstname, name: client.name, phone: client.phone })
  }

  const handleSave = async () => {
    if (!editingClient) return
    setSaving(true)

    if (editingClient.hasPhone) {
      // Client avec téléphone : met à jour toutes ses locations
      const { error } = await supabase.from('rentals').update({
        client_firstname: editForm.firstname,
        client_name: editForm.name.toUpperCase(),
        client_phone: editForm.phone,
      }).eq('client_phone', editingClient.phone)
      if (error) { alert('❌ Erreur lors de la sauvegarde.'); setSaving(false); return }
    } else {
      // Client parking : met à jour le nom dans tous ses parkings
      const { error } = await supabase.from('parkings').update({
        client_name: editForm.name.toUpperCase(),
      }).eq('client_name', editingClient.name)
      if (error) { alert('❌ Erreur lors de la sauvegarde.'); setSaving(false); return }
    }

    setEditingClient(null)
    fetchClients()
    setSaving(false)
  }

  // ── Suppression ────────────────────────────────────────────
  const handleDelete = async (client: ClientSummary) => {
    const name = `${client.firstname} ${client.name}`.trim()
    const totalVisits = client.visits + client.parkingVisits
    if (!confirm(`⚠️ Supprimer définitivement le client ${name} ?\n\nCela supprimera ${totalVisits} entrée(s).\n\nCette action est irréversible.`)) return

    if (client.hasPhone) {
      await supabase.from('rentals').delete().eq('client_phone', client.phone)
    }
    if (client.parkingVisits > 0) {
      await supabase.from('parkings').delete().eq('client_name', client.name)
    }
    fetchClients()
  }

  if (loading) return <div className="text-center py-16 text-gray-400">⏳ Chargement...</div>

  return (
    <div>
      {/* ── Modal édition ── */}
      {editingClient && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold text-gray-800 mb-5">✏️ Modifier le client</h3>
            <p className="text-gray-400 text-xs mb-4">
              Les modifications s'appliqueront sur toutes les entrées de ce client.
            </p>
            <div className="space-y-4">
              {editingClient.hasPhone && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Prénom</label>
                  <input type="text" value={editForm.firstname}
                    onChange={e => setEditForm(p => ({ ...p, firstname: e.target.value }))}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Nom</label>
                <input type="text" value={editForm.name}
                  onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              {editingClient.hasPhone && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Téléphone</label>
                  <input type="text" value={editForm.phone}
                    onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditingClient(null)}
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200">Annuler</button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 bg-blue-700 text-white py-3 rounded-xl font-bold hover:bg-blue-800 disabled:opacity-50">
                {saving ? '⏳...' : '✅ Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── En-tête ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Fichier clients</h2>
          <p className="text-gray-500 text-sm mt-1">{clients.length} client(s) unique(s)</p>
        </div>
      </div>

      <input type="text" placeholder="🔍 Rechercher un client..."
        value={search} onChange={e => setSearch(e.target.value)}
        className="w-full border border-gray-300 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 mb-4 text-sm" />

      <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-4 flex justify-between">
        <span className="text-blue-700 text-sm font-medium">{filtered.length} client(s)</span>
        <span className="text-blue-800 font-bold">CA total : {totalCA.toLocaleString()} {CONFIG.currency}</span>
      </div>

      <div className="space-y-3">
        {filtered.map((client, i) => (
          <div key={client.key} className="bg-white rounded-xl border p-4 hover:shadow-sm transition-shadow">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 font-mono">#{i + 1}</span>
                  <p className="font-semibold text-gray-800">
                    {client.firstname ? `${client.firstname} ${client.name}` : client.name}
                  </p>
                  {!client.hasPhone && (
                    <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">🅿️ Parking</span>
                  )}
                </div>
                {client.phone && <p className="text-gray-500 text-sm mt-0.5">{client.phone}</p>}
                <p className="text-gray-400 text-xs mt-1">
                  {client.visits > 0 && `${client.visits} location(s)`}
                  {client.visits > 0 && client.parkingVisits > 0 && ' · '}
                  {client.parkingVisits > 0 && `${client.parkingVisits} parking(s)`}
                  {' · '}Dernière : {new Date(client.lastVisit).toLocaleDateString('fr-FR')}
                </p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {client.activities.map(act => (
                    <span key={act} className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full">{act}</span>
                  ))}
                </div>
              </div>
              <div className="text-right ml-4">
                <p className="font-bold text-gray-800 text-xl">{client.totalCA.toLocaleString()}</p>
                <p className="text-gray-500 text-xs">{CONFIG.currency} CA</p>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <button onClick={() => openEdit(client)}
                className="flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-semibold px-3 py-1.5 rounded-lg border border-amber-200">
                ✏️ Modifier
              </button>
              <button onClick={() => handleDelete(client)}
                className="flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold px-3 py-1.5 rounded-lg border border-red-200">
                🗑️ Supprimer
              </button>
            </div>
          </div>
        ))}
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
