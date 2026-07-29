import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { CONFIG } from '../config'
import { Rental } from '../types'
import { openContractPDF } from '../utils/contractHTML'
import NewRental from './NewRental'

// ── Ouvrir la photo CIN (URL signée Supabase Storage, 60s) ──
// On ouvre la fenêtre IMMÉDIATEMENT (pendant l'événement clic) pour éviter le bloqueur de popups,
// puis on redirige vers l'URL signée une fois qu'elle est prête.
async function openIdPhoto(path: string) {
  const win = window.open('', '_blank')          // ← ouvre tout de suite
  const { data, error } = await supabase.storage.from('id-photos').createSignedUrl(path, 60)
  if (error || !data?.signedUrl) {
    win?.close()
    alert('❌ Impossible d\'ouvrir la photo. Vérifiez que le bucket "id-photos" existe dans Supabase Storage.')
    return
  }
  if (win) {
    win.location.href = data.signedUrl           // ← redirige vers la photo
  } else {
    // Fallback si le navigateur a quand même bloqué
    window.location.href = data.signedUrl
  }
}

// ── Types ──────────────────────────────────────────────────────
interface ParkingRecord {
  id: string
  type: string
  price: number
  client_name: string
  description: string | null
  payment_method: string
  status: string
  created_at: string
}

// ── Helpers ────────────────────────────────────────────────────
const fmt = (iso: string | null) => {
  if (!iso) return '--:--'
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}
const fmtDate = (iso: string | null) => {
  if (!iso) return '--'
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
const toDatetimeLocal = (iso: string | null) => {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function Archives() {
  const [rentals, setRentals] = useState<Rental[]>([])
  const [parkings, setParkings] = useState<ParkingRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dateFilter, setDateFilter] = useState('')

  // ── Modification complète d'une location (formulaire 6 étapes) ──
  const [editingRentalFull, setEditingRentalFull] = useState<Rental | null>(null)

  // ── Modification simple d'un parking ─────────────────────────
  const [editingParking, setEditingParking] = useState<ParkingRecord | null>(null)
  const [editParkingForm, setEditParkingForm] = useState({
    client_name: '', description: '', price: 0, payment_method: '',
  })
  const [saving, setSaving] = useState(false)

  // ── Chargement des données ─────────────────────────────────
  const fetchAll = async () => {
    const [rentalsRes, parkingsRes] = await Promise.all([
      supabase.from('rentals').select('*').eq('status', 'archived').order('created_at', { ascending: false }),
      supabase.from('parkings').select('*').eq('status', 'archived').order('created_at', { ascending: false }),
    ])
    setRentals(rentalsRes.data || [])
    setParkings(parkingsRes.data || [])
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [])

  // ── Filtrage ───────────────────────────────────────────────
  const filteredRentals = rentals.filter(r => {
    const nameMatch = !search ||
      `${r.client_firstname} ${r.client_name}`.toLowerCase().includes(search.toLowerCase()) ||
      r.client_phone.includes(search)
    const dateMatch = !dateFilter || r.created_at.startsWith(dateFilter)
    return nameMatch && dateMatch
  })

  const filteredParkings = parkings.filter(p => {
    const nameMatch = !search || p.client_name.toLowerCase().includes(search.toLowerCase())
    const dateMatch = !dateFilter || p.created_at.startsWith(dateFilter)
    return nameMatch && dateMatch
  })

  const totalCA =
    filteredRentals.reduce((s, r) => s + r.price, 0) +
    filteredParkings.reduce((s, p) => s + p.price, 0)

  const totalCount = filteredRentals.length + filteredParkings.length

  // ── Suppression location ───────────────────────────────────
  const handleDeleteRental = async (rental: Rental) => {
    const name = `${rental.client_firstname} ${rental.client_name}`
    if (!confirm(`⚠️ Supprimer définitivement la location de ${name} ?\n\nCette action est irréversible.`)) return
    const { error } = await supabase.from('rentals').delete().eq('id', rental.id)
    if (error) alert('❌ Erreur lors de la suppression.')
    else fetchAll()
  }

  // ── Édition parking (modal simple) ────────────────────────
  const openEditParking = (parking: ParkingRecord) => {
    setEditingParking(parking)
    setEditParkingForm({
      client_name: parking.client_name,
      description: parking.description || '',
      price: parking.price,
      payment_method: parking.payment_method,
    })
  }

  const handleSaveParking = async () => {
    if (!editingParking) return
    setSaving(true)
    const { error } = await supabase.from('parkings').update({
      client_name: editParkingForm.client_name.toUpperCase(),
      description: editParkingForm.description || null,
      price: Number(editParkingForm.price),
      payment_method: editParkingForm.payment_method,
    }).eq('id', editingParking.id)
    if (error) alert('❌ Erreur lors de la sauvegarde.')
    else { setEditingParking(null); fetchAll() }
    setSaving(false)
  }

  const handleDeleteParking = async (parking: ParkingRecord) => {
    if (!confirm(`⚠️ Supprimer définitivement le parking de ${parking.client_name} ?\n\nCette action est irréversible.`)) return
    const { error } = await supabase.from('parkings').delete().eq('id', parking.id)
    if (error) alert('❌ Erreur lors de la suppression.')
    else fetchAll()
  }

  // ── Overlay modification complète ─────────────────────────
  if (editingRentalFull) {
    return (
      <div className="fixed inset-0 bg-gray-50 z-50 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-4">

          {/* Barre de navigation */}
          <div className="flex items-center gap-3 mb-5 bg-white rounded-2xl border px-4 py-3 shadow-sm">
            <button
              onClick={() => setEditingRentalFull(null)}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2"
            >
              ← Annuler
            </button>
            <div>
              <p className="font-bold text-gray-800 text-sm">Modification complète</p>
              <p className="text-gray-500 text-xs">
                {editingRentalFull.client_firstname} {editingRentalFull.client_name} · {editingRentalFull.contract_number}
              </p>
            </div>
          </div>

          {/* Formulaire NewRental en mode modification */}
          <NewRental
            editRental={editingRentalFull}
            onComplete={() => {
              setEditingRentalFull(null)
              fetchAll()
            }}
            onPause={() => setEditingRentalFull(null)}
          />
        </div>
      </div>
    )
  }

  if (loading) return <div className="text-center py-16 text-gray-400">⏳ Chargement...</div>

  return (
    <div>
      {/* ── Modal édition PARKING (simple) ── */}
      {editingParking && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-gray-800 mb-5">✏️ Modifier le parking</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Nom du client</label>
                <input type="text" value={editParkingForm.client_name}
                  onChange={e => setEditParkingForm(p => ({ ...p, client_name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Description du jet</label>
                <textarea value={editParkingForm.description}
                  onChange={e => setEditParkingForm(p => ({ ...p, description: e.target.value }))}
                  rows={2}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Prix ({CONFIG.currency})</label>
                <input type="number" value={editParkingForm.price}
                  onChange={e => setEditParkingForm(p => ({ ...p, price: Number(e.target.value) }))}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Mode de paiement</label>
                <select value={editParkingForm.payment_method}
                  onChange={e => setEditParkingForm(p => ({ ...p, payment_method: e.target.value }))}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                  {CONFIG.paymentMethods.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditingParking(null)}
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200">Annuler</button>
              <button onClick={handleSaveParking} disabled={saving}
                className="flex-1 bg-blue-700 text-white py-3 rounded-xl font-bold hover:bg-blue-800 disabled:opacity-50">
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
          <p className="text-gray-500 text-sm mt-1">
            {rentals.length} location(s) · {parkings.length} parking(s)
          </p>
        </div>
      </div>

      {/* ── Filtres ── */}
      <div className="flex gap-3 mb-4">
        <input type="text" placeholder="🔍 Nom, prénom ou téléphone..."
          value={search} onChange={e => setSearch(e.target.value)}
          className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
        <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)}
          className="border border-gray-300 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
        {(search || dateFilter) && (
          <button onClick={() => { setSearch(''); setDateFilter('') }}
            className="text-gray-400 hover:text-gray-600 px-3">✕</button>
        )}
      </div>

      {/* ── Barre récap ── */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-4 flex justify-between items-center">
        <span className="text-blue-700 text-sm font-medium">{totalCount} résultat(s)</span>
        <span className="text-blue-800 font-bold">CA : {totalCA.toLocaleString()} {CONFIG.currency}</span>
      </div>

      {/* ── Section Locations ── */}
      {filteredRentals.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">
            📋 Locations ({filteredRentals.length})
          </h3>
          <div className="space-y-3">
            {filteredRentals.map(rental => (
              <div key={rental.id} className="bg-white rounded-xl border p-4 hover:shadow-sm transition-shadow">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-gray-800">{rental.client_firstname} {rental.client_name}</p>
                    <p className="text-gray-500 text-sm">{rental.client_phone}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-gray-800 text-lg">{rental.price.toLocaleString()} {CONFIG.currency}</span>
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
                  <span className="bg-gray-100 px-2 py-0.5 rounded-lg">📅 {fmtDate(rental.created_at)}</span>
                  <span className="bg-gray-100 px-2 py-0.5 rounded-lg">📋 {rental.contract_number}</span>
                </div>
                <div className="mt-3 flex gap-2">
                  <button onClick={() => openContractPDF(rental)}
                    className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-lg border border-blue-200">
                    📄 Contrat
                  </button>
                  {rental.id_photo_url && (
                    <button onClick={() => openIdPhoto(rental.id_photo_url!)}
                      className="flex items-center gap-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-semibold px-3 py-1.5 rounded-lg border border-purple-200">
                      📷 Photo CIN
                    </button>
                  )}
                  <button onClick={() => setEditingRentalFull(rental)}
                    className="flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-semibold px-3 py-1.5 rounded-lg border border-amber-200">
                    ✏️ Modifier
                  </button>
                  <button onClick={() => handleDeleteRental(rental)}
                    className="flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold px-3 py-1.5 rounded-lg border border-red-200">
                    🗑️ Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Section Parkings ── */}
      {filteredParkings.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">
            🅿️ Parkings ({filteredParkings.length})
          </h3>
          <div className="space-y-3">
            {filteredParkings.map(parking => (
              <div key={parking.id} className="bg-white rounded-xl border p-4 hover:shadow-sm transition-shadow">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">🅿️</span>
                      <p className="font-semibold text-gray-800">{parking.client_name}</p>
                    </div>
                    <p className="text-gray-500 text-sm mt-0.5">{parking.type}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-gray-800 text-lg">{parking.price.toLocaleString()} {CONFIG.currency}</span>
                    <p className="text-gray-400 text-xs">{parking.payment_method}</p>
                  </div>
                </div>
                {parking.description && (
                  <p className="text-gray-500 text-xs mt-2 italic">📝 {parking.description}</p>
                )}
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
                  <span className="bg-gray-100 px-2 py-0.5 rounded-lg">📅 {fmtDate(parking.created_at)}</span>
                </div>
                <div className="mt-3 flex gap-2">
                  <button onClick={() => openEditParking(parking)}
                    className="flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-semibold px-3 py-1.5 rounded-lg border border-amber-200">
                    ✏️ Modifier
                  </button>
                  <button onClick={() => handleDeleteParking(parking)}
                    className="flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold px-3 py-1.5 rounded-lg border border-red-200">
                    🗑️ Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {totalCount === 0 && (
        <div className="text-center py-12 text-gray-400">
          <div className="text-5xl mb-3">📭</div>
          <p>Aucun résultat trouvé</p>
        </div>
      )}
    </div>
  )
}
