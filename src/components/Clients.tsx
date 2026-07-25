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
  lastVisit: string
  activities: string[]
}

export default function Clients() {
  const [clients, setClients] = useState<ClientSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('rentals')
        .select('client_name, client_firstname, client_phone, client_id_number, price, created_at, activity_name')
        .order('created_at', { ascending: false })

      if (data) {
        const map = new Map<string, ClientSummary>()

        data.forEach(r => {
          const key = r.client_phone.replace(/\s/g, '')
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
              lastVisit: r.created_at,
              activities: [r.activity_name],
            })
          }
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
        {filtered.map((client, i) => (
          <div key={client.key} className="bg-white rounded-xl border p-4 hover:shadow-sm transition-shadow">
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
                  {client.visits} visite(s) · Dernière : {new Date(client.lastVisit).toLocaleDateString('fr-FR')}
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
