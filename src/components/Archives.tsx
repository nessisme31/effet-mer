import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { CONFIG } from '../config'
import { Rental } from '../types'
import { openContractPDF } from '../utils/contractHTML'

interface Props {
  onEditRental: (id: string) => void   // ← NOUVEAU
}

const fmt = (iso: string) =>
  new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })

export default function Archives({ onEditRental }: Props) {
  const [rentals, setRentals] = useState<Rental[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dateFilter, setDateFilter] = useState('')

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('rentals')
        .select('*')
        .eq('status', 'archived')
        .order('created_at', { ascending: false })
      setRentals(data || [])
      setLoading(false)
    }
    fetch()
  }, [])

  const filtered = rentals.filter(r => {
    const nameMatch = !search ||
      `${r.client_firstname} ${r.client_name}`.toLowerCase().includes(search.toLowerCase()) ||
      r.client_phone.includes(search)
    const dateMatch = !dateFilter ||
      r.created_at.startsWith(dateFilter)
    return nameMatch && dateMatch
  })

  const totalCA = filtered.reduce((sum, r) => sum + r.price, 0)

  if (loading) return <div className="text-center py-16 text-gray-400">⏳ Chargement...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Archives</h2>
          <p className="text-gray-500 text-sm mt-1">{rentals.length} location(s) archivée(s)</p>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex gap-3 mb-4">
        <input
          type="text"
          placeholder="🔍 Nom, prénom ou téléphone..."
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

      {/* Résumé CA */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-4 flex justify-between items-center">
        <span className="text-blue-700 text-sm font-medium">{filtered.length} résultat(s)</span>
        <span className="text-blue-800 font-bold">CA : {totalCA.toLocaleString()} {CONFIG.currency}</span>
      </div>

      {/* Liste */}
      <div className="space-y-3">
        {filtered.map(rental => (
          <div key={rental.id} className="bg-white rounded-xl border p-4 hover:shadow-sm transition-shadow">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold text-gray-800">
                  {rental.client_firstname} {rental.client_name}
                </p>
                <p className="text-gray-500 text-sm">{rental.client_phone}</p>
              </div>
              <div className="flex items-center gap-2">
                {/* ── Bouton Modifier ── */}
                <button
                  onClick={() => onEditRental(rental.id)}
                  className="bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                  title="Modifier cette location"
                >
                  ✏️ Modifier
                </button>
                <div className="text-right">
                  <span className="font-bold text-gray-800 text-lg">
                    {rental.price.toLocaleString()} {CONFIG.currency}
                  </span>
                  <p className="text-gray-400 text-xs">{rental.payment_method}</p>
                </div>
              </div>
            </div>

            <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
              <span className="bg-blue-50 px-2 py-0.5 rounded-lg text-blue-700">
                {rental.activity_name}{rental.activity_subtype ? ` — ${rental.activity_subtype}` : ''}
              </span>
              {rental.jet_ski_id && (
                <span className="bg-gray-100 px-2 py-0.5 rounded-lg">
                  🚤 {rental.jet_ski_id.split(',').join(' + ')}
                </span>
              )}
              <span className="bg-gray-100 px-2 py-0.5 rounded-lg">
                ⏱️ {fmt(rental.start_time)} → {fmt(rental.end_time)}
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
        ))}

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
