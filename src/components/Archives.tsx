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
interface LateFeeRecord {
  id: string
  created_at: string
  amount: number
  comment: string | null
  rental_id: string | null
  client_name: string | null
  payment_method: string | null
}

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
  const [lateFees, setLateFees] = useState<LateFeeRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dateFilter, setDateFilter] = useState('')

  // ── Export Excel ───────────────────────────────────────────
  const [exportModal, setExportModal] = useState(false)
  const _today = new Date().toISOString().slice(0, 10)
  const [exportFrom, setExportFrom] = useState(_today)
  const [exportTo,   setExportTo]   = useState(_today)
  const [exporting,  setExporting]  = useState(false)

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
    const [rentalsRes, parkingsRes, lateFeesRes] = await Promise.all([
      supabase.from('rentals').select('*').eq('status', 'archived').order('created_at', { ascending: false }),
      supabase.from('parkings').select('*').eq('status', 'archived').order('created_at', { ascending: false }),
      supabase.from('late_fees').select('*').order('created_at', { ascending: false }),
    ])
    setRentals(rentalsRes.data || [])
    setParkings(parkingsRes.data || [])
    setLateFees(lateFeesRes.data || [])
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [])

  // ── Export Excel ───────────────────────────────────────────
  const ACTIVITY_ORDER: Record<string, number> = {
    'Jet Ski FX': 1, 'Jet Ski VX': 2, 'Bouée Tractée': 3,
    'Ski Nautique': 4, 'Wakeboard': 5, 'Paddle': 6,
    'Kayak': 7, 'Scooter sous-marin': 8,
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      // 1. Filtrer par plage de dates ET uniquement Jet Ski (VX ou FX, toutes durées)
      const isJetSkiActivity = (name: string) => name.toLowerCase().includes('jet ski')
      const toExport = rentals.filter(r => {
        const d = r.created_at.slice(0, 10)
        const inRange = d >= exportFrom && d <= exportTo
        // Garder si au moins un item du panier est un jet ski (quelle que soit la durée)
        const isJetSki = r.cart_items && Array.isArray(r.cart_items) && r.cart_items.length > 0
          ? r.cart_items.some((item: { activity: { name: string } }) => isJetSkiActivity(item.activity.name))
          : isJetSkiActivity(r.activity_name)
        return inRange && isJetSki
      })

      if (toExport.length === 0) {
        alert('⚠️ Aucune sortie Jet Ski VX ou FX sur cette période.')
        setExporting(false)
        return
      }

      // 2. Trier : d'abord par catégorie activité, puis par date
      const sorted = [...toExport].sort((a, b) => {
        const oA = ACTIVITY_ORDER[a.activity_name] ?? 99
        const oB = ACTIVITY_ORDER[b.activity_name] ?? 99
        if (oA !== oB) return oA - oB
        return a.created_at.localeCompare(b.created_at)
      })

      // 3. Construire les lignes du fichier Excel
      const XLSX = await import('xlsx')

      const header = [
        'Activité', 'Sous-type', 'Nom', 'Prénom', "N° Pièce d'identité",
        'Téléphone', 'Date', 'Heure début', 'Heure fin', 'Durée',
        `Montant (${CONFIG.currency})`, 'Mode de paiement', 'N° Contrat',
      ]

      const rows: (string | number)[][] = [header]
      let currentCategory = ''

      sorted.forEach(r => {
        // Ligne séparatrice + titre catégorie entre chaque groupe
        if (r.activity_name !== currentCategory) {
          if (currentCategory) rows.push([]) // ligne vide séparatrice
          rows.push([`── ${r.activity_name} ──`]) // titre catégorie
          currentCategory = r.activity_name
        }
        rows.push([
          r.activity_name,
          r.activity_subtype || '',
          r.client_name,
          r.client_firstname,
          r.client_id_number || '',
          r.client_phone || '',
          fmtDate(r.created_at),
          r.start_time ? fmt(r.start_time) : '',
          r.end_time   ? fmt(r.end_time)   : '',
          r.duration || '',
          r.price,
          r.payment_method,
          r.contract_number,
        ])
      })

      // 4. Générer et télécharger le fichier .xlsx
      const ws = XLSX.utils.aoa_to_sheet(rows)

      // Largeurs de colonnes
      ws['!cols'] = [
        { wch: 18 }, { wch: 14 }, { wch: 16 }, { wch: 16 },
        { wch: 16 }, { wch: 14 }, { wch: 12 }, { wch: 11 },
        { wch: 11 }, { wch: 8  }, { wch: 12 }, { wch: 18 }, { wch: 18 },
      ]

      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Archives')
      XLSX.writeFile(wb, `Archives-EffetMer-${exportFrom}-au-${exportTo}.xlsx`)

    } catch (err) {
      console.error('Export error:', err)
      alert('❌ Erreur lors de l\'export. Réessayez.')
    }
    setExporting(false)
    setExportModal(false)
  }

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

  const filteredLateFees = lateFees.filter(lf => {
    const nameMatch = !search || (lf.client_name || '').toLowerCase().includes(search.toLowerCase())
      || (lf.comment || '').toLowerCase().includes(search.toLowerCase())
    const dateMatch = !dateFilter || lf.created_at.startsWith(dateFilter)
    return nameMatch && dateMatch
  })

  const totalCA =
    filteredRentals.reduce((s, r) => s + r.price, 0) +
    filteredParkings.reduce((s, p) => s + p.price, 0) +
    filteredLateFees.reduce((s, lf) => s + lf.amount, 0)

  const totalCount = filteredRentals.length + filteredParkings.length + filteredLateFees.length

  // ── Suppression location ───────────────────────────────────
  const handleDeleteRental = async (rental: Rental) => {
    const name = `${rental.client_firstname} ${rental.client_name}`
    if (!confirm(`⚠️ Supprimer définitivement la location de ${name} ?\n\nCette action est irréversible.`)) return
    const { error } = await supabase.from('rentals').delete().eq('id', rental.id)
    if (error) alert('❌ Erreur lors de la suppression.')
    else fetchAll()
  }

  // ── Suppression frais de retard ───────────────────────────
  const handleDeleteLateFee = async (lf: LateFeeRecord) => {
    const label = lf.client_name ? `le retard de ${lf.client_name}` : `ce retard de ${lf.amount} ${CONFIG.currency}`
    if (!confirm(`⚠️ Supprimer définitivement ${label} ?\n\nCette action est irréversible.`)) return
    const { error } = await supabase.from('late_fees').delete().eq('id', lf.id)
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

      {/* ── Export Modal ── */}
      {exportModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold text-gray-800 mb-1">📥 Export Excel</h3>
            <p className="text-gray-500 text-sm mb-5">Choisissez la période à exporter</p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">📅 Du</label>
                <input type="date" value={exportFrom} onChange={e => setExportFrom(e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">📅 Au</label>
                <input type="date" value={exportTo} onChange={e => setExportTo(e.target.value)}
                  min={exportFrom}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 text-sm" />
              </div>
            </div>

            {/* Raccourcis rapides */}
            <div className="flex gap-2 mb-5 flex-wrap">
              {[
                { label: "Aujourd'hui", from: _today, to: _today },
                { label: 'Ce mois', from: _today.slice(0, 7) + '-01', to: _today },
                { label: 'Tout', from: '2024-01-01', to: _today },
              ].map(s => (
                <button key={s.label}
                  onClick={() => { setExportFrom(s.from); setExportTo(s.to) }}
                  className="text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold px-3 py-1.5 rounded-lg transition-colors">
                  {s.label}
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setExportModal(false)}
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200">
                Annuler
              </button>
              <button onClick={handleExport} disabled={exporting || !exportFrom || !exportTo}
                className="flex-1 bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 disabled:opacity-40 transition-colors">
                {exporting ? '⏳ Export...' : '📥 Télécharger'}
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
        <button
          onClick={() => setExportModal(true)}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm"
        >
          📥 Export Excel
        </button>
      </div>

      {/* ── Filtres ── */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-4 space-y-3">
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">🔍 Recherche par nom</label>
            <input type="text" placeholder="Nom, prénom ou téléphone..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">📅 Filtrer par date</label>
            <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)}
              className="border border-gray-300 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
          </div>
        </div>
        {(search || dateFilter) && (
          <button onClick={() => { setSearch(''); setDateFilter('') }}
            className="text-xs text-red-500 hover:text-red-700 font-semibold flex items-center gap-1">
            ✕ Effacer les filtres
          </button>
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

      {/* ── Section Retards ── */}
      {filteredLateFees.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">
            ⏰ Retards ({filteredLateFees.length}) · {filteredLateFees.reduce((s, lf) => s + lf.amount, 0).toLocaleString()} {CONFIG.currency}
          </h3>
          <div className="space-y-3">
            {filteredLateFees.map(lf => (
              <div key={lf.id} className="bg-red-50 border border-red-200 rounded-xl p-4 hover:shadow-sm transition-shadow">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">⏰ Retard</span>
                      {lf.client_name && (
                        <span className="text-gray-700 text-sm font-semibold">{lf.client_name}</span>
                      )}
                    </div>
                    {lf.comment && (
                      <p className="text-gray-500 text-sm mt-0.5 italic">💬 {lf.comment}</p>
                    )}
                  </div>
                  <span className="font-bold text-red-700 text-lg flex-shrink-0 ml-3">
                    +{lf.amount.toLocaleString()} {CONFIG.currency}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-gray-500 mb-3">
                  <span className="bg-white px-2 py-0.5 rounded-lg border">📅 {fmtDate(lf.created_at)}</span>
                  {lf.payment_method && (
                    <span className="bg-white px-2 py-0.5 rounded-lg border">💳 {lf.payment_method}</span>
                  )}
                  {lf.rental_id && (
                    <span className="bg-white px-2 py-0.5 rounded-lg border">🔗 Lié à une location</span>
                  )}
                </div>
                <button onClick={() => handleDeleteLateFee(lf)}
                  className="flex items-center gap-1.5 bg-white hover:bg-red-100 text-red-700 text-xs font-semibold px-3 py-1.5 rounded-lg border border-red-300 transition-colors">
                  🗑️ Supprimer
                </button>
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
