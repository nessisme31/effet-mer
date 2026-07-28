import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { CONFIG } from '../config'
import { Rental } from '../types'
import { openContractPDF } from '../utils/contractHTML'

const fmt = (iso: string) =>
  new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })

const toDatetimeLocal = (iso: string) => {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function Archives() {
  const [rentals, setRentals] = useState<Rental[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dateFilter, setDateFilter] = useState('')

  // ── Édition ───────────────────────────────────────────────
  const [editingRental, setEditingRental] = useState<Rental | null>(null)
  const [editForm, setEditForm] = useState({
    client_firstname: '',
    client_name: '',
    client_phone: '',
    price: 0,
    payment_method: '',
    start_time: '',
    end_time: '',
  })
  const [saving, setSaving] = useState(false)

  const fetchRentals = async () => {
    const { data } = await supabase
      .from('rentals')
      .select('*')
      .eq('status', 'archived')
      .order('created_at', { ascending: false })
    setRentals(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchRentals() }, [])

  const filtered = rentals.filter(r => {
    const nameMatch = !search ||
      `${r.client_firstname} ${r.client_name}`.toLowerCase().includes(search.toLowerCase()) ||
      r.client_phone.includes(search)
    const dateMatch = !dateFilter || r.created_at.startsWith(dateFilter)
    return nameMatch && dateMatch
  })

  const totalCA = filtered.reduce((sum, r) => sum + r.price, 0)

  // ── Ouvrir le modal d'édition ──────────────────────────────
  const openEdit = (rental: Rental) => {
    setEditingRental(rental)
    setEditForm({
      client_firstname: rental.client_firstname,
      client_name: rental.client_name,
      client_phone: rental.client_phone,
      price: rental.price,
      payment_method: rental.payment_method,
      start_time: toDatetimeLocal(rental.start_time),
      end_time: toDatetimeLocal(rental.end_time),
    })
  }

  // ── Sauvegarder les modifications ─────────────────────────
  const handleSave = async () => {
    if (!editingRental) return
    setSaving(true)
    const { error } = await supabase
      .from('rentals')
      .update({
        client_firstname: editForm.client_firstname,
        client_name: editForm.client_name.toUpperCase(),
        client_phone: editForm.client_phone,
        price: Number(editForm.price),
        payment_method: editForm.payment_method,
        start_time: new Date(editForm.start_time).toISOString(),
        end_time: new Date(editForm.end_time).toISOString(),
      })
      .eq('id', editingRental.id)

    if (error) {
      alert('❌ Erreur lors de la sauvegarde.')
    } else {
      setEditingRental(null)
      fetchRentals()
    }
    setSaving(false)
  }

  // ── Supprimer une location ────────────────────────────────
  const handleDelete = async (rental: Rental) => {
    const name = `${rental.client_firstname} ${rental.client_name}`
    if (!confirm(`⚠️ Supprimer définitivement la location de ${name} ?\n\nCette action est irréversible.`)) return
    const { error } = await supabase.from('rentals').delete().eq('id', rental.id)
    if (error) {
      alert('❌ Erreur lors de la suppression.')
    } else {
      fetchRentals()
    }
  }

  if (loading) return <div className="text-center py-16 text-gray-400">⏳ Chargement...</div>

  return (
    <div>
      {/* ── Modal d'édition ── */}
      {editingRental && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-800 mb-5">✏️ Modifier la location</h3>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Prénom</label>
                  <input
                    type="text"
                    value={editForm.client_firstname}
                    onChange={e => setEditForm(p => ({ ...p, client_firstname: e.target.value }))}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Nom</label>
                  <input
                    type="text"
                    value={editForm.client_name}
                    onChange={e => setEditForm(p => ({ ...p, client_name: e.target.value }))}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Téléphone</label>
                <input
                  type="text"
                  value={editForm.client_phone}
                  onChange={e => setEditForm(p => ({ ...p, client_phone: e.target.value }))}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Prix ({CONFIG.currency})</label>
                <input
                  type="number"
                  value={editForm.price}
                  onChange={e => setEditForm(p => ({ ...p, price: Number(e.target.value) }))}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Mode de paiement</label>
                <select
                  value={editForm.payment_method}
                  onChange={e => setEditForm(p => ({ ...p, payment_method: e.target.value }))}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  {CONFIG.paymentMethods.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">🕐 Heure de départ</label>
                <input
                  type="datetime-local"
                  value={editForm.start_time}
                  onChange={e => setEditForm(p => ({ ...p, start_time: e.target.value }))}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">🏁 Heure de retour</label>
                <input
                  type="datetime-local"
                  value={editForm.end_time}
                  onChange={e => setEditForm(p => ({ ...p, end_time: e.target.value }))}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditingRental(null)}
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-blue-700 text-white py-3 rounded-xl font-bold hover:bg-blue-800 disabled:opacity-50"
              >
                {saving ? '⏳ Sauvegarde...' : '✅ Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── En-tête ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Archives</h2>
          <p className="text-gray-500 text-sm mt-1">{rentals.length} location(s) archivée(s)</p>
        </div>
      </div>

      {/* ── Filtres ── */}
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

      {/* ── Barre récap ── */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-4 flex justify-between items-center">
        <span className="text-blue-700 text-sm font-medium">{filtered.length} résultat(s)</span>
        <span className="text-blue-800 font-bold">CA : {totalCA.toLocaleString()} {CONFIG.currency}</span>
      </div>

      {/* ── Liste ── */}
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
              <div className="text-right">
                <span className="font-bold text-gray-800 text-lg">
                  {rental.price.toLocaleString()} {CONFIG.currency}
                </span>
                <p className="text-gray-400 text-xs">{rental.payment_method}</p>
              </div>
            </div>

            <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
              <span className="bg-blue-50 px-2 py-0.5 rounded-lg text-blue-700">
                {rental.activity_name}{rental.activity_subtype ? ` — ${rental.activity_subtype}` : ''}
              </span>
              {rental.jet_ski_id && (
                <span className="bg-gray-100 px-2 py-0.5 rounded-lg">🚤 {rental.jet_ski_id}</span>
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

            {/* ── Actions ── */}
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => openContractPDF(rental)}
                className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors border border-blue-200"
              >
                📄 Contrat
              </button>
              <button
                onClick={() => openEdit(rental)}
                className="flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors border border-amber-200"
              >
                ✏️ Modifier
              </button>
              <button
                onClick={() => handleDelete(rental)}
                className="flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors border border-red-200"
              >
                🗑️ Supprimer
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
