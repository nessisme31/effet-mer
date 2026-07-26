import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { CONFIG } from '../config'
import { Rental } from '../types'
import { openContractPDF } from '../utils/contractHTML'

interface ParkingEntry {
  id: string
  type: string
  price: number
  client_name: string
  description: string | null
  payment_method: string
  status: string
  created_at: string
}

type ArchiveItem =
  | { kind: 'rental'; data: Rental }
  | { kind: 'parking'; data: ParkingEntry }

const fmt = (iso: string) =>
  new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })

export default function Archives() {
  const [rentals, setRentals] = useState<Rental[]>([])
  const [parkings, setParkings] = useState<ParkingEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dateFilter, setDateFilter] = useState('')

  useEffect(() => {
    const fetchAll = async () => {
      const [rentalsRes, parkingsRes] = await Promise.all([
        supabase
          .from('rentals')
          .select('*')
          .eq('status', 'archived')
          .order('created_at', { ascending: false }),
        supabase
          .from('parkings')
          .select('*')
          .eq('status', 'archived')
          .order('created_at', { ascending: false }),
      ])
      setRentals(rentalsRes.data || [])
      setParkings(parkingsRes.data || [])
      setLoading(false)
    }
    fetchAll()
  }, [])

  // Fusionner et trier par date décroissante
  const allItems: ArchiveItem[] = [
    ...rentals.map(r => ({ kind: 'rental' as const, data: r })),
    ...parkings.map(p => ({ kind: 'parking' as const, data: p })),
  ].sort((a, b) =>
    new Date(b.data.created_at).getTime() - new Date(a.data.created_at).getTime()
  )

  const filtered = allItems.filter(item => {
    const name = item.kind === 'rental'
      ? `${item.data.client_firstname || ''} ${item.data.client_name}`
      : item.data.client_name
    const nameMatch = !search || name.toLowerCase().includes(search.toLowerCase())
    const dateMatch = !dateFilter || item.data.created_at.startsWith(dateFilter)
    return nameMatch && dateMatch
  })

  const totalCA = filtered.reduce((sum, item) => sum + item.data.price, 0)

  const totalItems = rentals.length + parkings.length

  if (loading) return <div className="text-center py-16 text-gray-400">⏳ Chargement...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Archives</h2>
          <p className="text-gray-500 text-sm mt-1">
            {rentals.length} location(s) · {parkings.length} parking(s)
          </p>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex gap-3 mb-4">
        <input
          type="text"
          placeholder="🔍 Nom, prénom ou client..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
        <input
          type="date"
          value={dateFilter}
          onChange={e => setDateFilter(e.target.value)}
          className="border border-gray-300 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
        {(search || dateFilter) && (
          <button
            onClick={() => { setSearch(''); setDateFilter('') }}
            className="text-gray-400 hover:text-gray-600 px-3"
          >
            ✕
          </button>
        )}
      </div>

      {/* Résumé */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-4 flex justify-between items-center">
        <span className="text-blue-700 text-sm font-medium">{filtered.length} résultat(s) sur {totalItems}</span>
        <span className="text-blue-800 font-bold">CA : {totalCA.toLocaleString()} {CONFIG.currency}</span>
      </div>

      {/* Liste */}
      <div className="space-y-3">
        {filtered.map((item, idx) => {
          if (item.kind === 'rental') {
            const rental = item.data as Rental
            return (
              <div key={`rental-${rental.id}`} className="bg-white rounded-xl border p-4 hover:shadow-sm transition-shadow">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-gray-800">
                      {rental.client_firstname} {rental.client_name}
                    </p>
                    <p className="text-gray-500 text-sm">{rental.client_phone}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-gray-800 text-lg">
                      {rental.price.toLocaleString()} {CONFIG.currency}
                    </span>
                    <p className="text-gray-400 text-xs">{rental.payment_method}</p>
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
                  <span className="bg-blue-50 px-2 py-0.5 rounded-lg text-blue-700">
                    🚤 {rental.activity_name}{rental.activity_subtype ? ` — ${rental.activity_subtype}` : ''}
                  </span>
                  {rental.jet_ski_id && (
                    <span className="bg-gray-100 px-2 py-0.5 rounded-lg">🚤 {rental.jet_ski_id}</span>
                  )}
                  <span className="bg-gray-100 px-2 py-0.5 rounded-lg">
                    ⏱️ {fmt(rental.start_time ?? '')} → {fmt(rental.end_time ?? '')}
                  </span>
                  <span className="bg-gray-100 px-2 py-0.5 rounded-lg">
                    📅 {fmtDate(rental.created_at)}
                  </span>
                  <span className="bg-gray-100 px-2 py-0.5 rounded-lg">
                    📋 {rental.contract_number}
                  </span>
                </div>

                <div className="mt-3">
                  <button
                    onClick={() => openContractPDF(rental)}
                    className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors border border-blue-200"
                  >
                    📄 Télécharger le contrat
                  </button>
                </div>
              </div>
            )
          } else {
            const parking = item.data as ParkingEntry
            return (
              <div key={`parking-${parking.id}`} className="bg-white rounded-xl border border-indigo-100 p-4 hover:shadow-sm transition-shadow">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded-full">
                        🅿️ Parking
                      </span>
                    </div>
                    <p className="font-semibold text-gray-800">{parking.client_name}</p>
                    {parking.description && (
                      <p className="text-gray-500 text-sm mt-0.5">📝 {parking.description}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-gray-800 text-lg">
                      {parking.price.toLocaleString()} {CONFIG.currency}
                    </span>
                    <p className="text-gray-400 text-xs">{parking.payment_method}</p>
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
                  <span className="bg-indigo-50 px-2 py-0.5 rounded-lg text-indigo-700">
                    🅿️ {parking.type}
                  </span>
                  <span className="bg-gray-100 px-2 py-0.5 rounded-lg">
                    📅 {fmtDate(parking.created_at)}
                  </span>
                </div>
              </div>
            )
          }
        })}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <div className="text-5xl mb-3">📭</div>
            <p>Aucun résultat trouvé</p>
          </div>
        )}
      </div>
    </div>
  )
}
