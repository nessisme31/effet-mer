import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { CONFIG } from '../config'
import { Rental, WaitingEntry, CartItem, ItemStatus } from '../types'
import EditRentalModal from './EditRentalModal'

const PENDING_PAYMENT = 'En attente de paiement'
const PAYMENT_ICONS: Record<string, string> = {
  'Espèces': '💵',
  'Carte bancaire': '💳',
  'Virement': '🏦',
}

interface Props {
  onNewRental: () => void
}

interface LateFee {
  id: string
  created_at: string
  amount: number
  comment: string | null
  rental_id: string | null
  client_name: string | null
  payment_method: string | null
}

interface RentalOption {
  id: string
  label: string
}

const fmt = (iso: string) =>
  new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })

const pad = (n: number) => String(n).padStart(2, '0')
const formatForInput = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`

// ─── Panel "Démarrer une activité" ──────────────────────────
interface StartItemPanelProps {
  item: CartItem
  title: string
  onConfirm: (startTime: string, endTime: string, jetSkiId?: string) => void
  onCancel: () => void
}

function StartItemPanel({ item, title, onConfirm, onCancel }: StartItemPanelProps) {
  const [startTime, setStartTime] = useState(formatForInput(new Date()))
  const [selectedJet, setSelectedJet] = useState('')
  const [occupiedJets, setOccupiedJets] = useState<Record<string, string>>({})

  const requiresJet = item.activity.requiresJetSki ?? false
  const jetType = item.activity.jetType as 'VX' | 'FX' | undefined
  const jetsForType = requiresJet && jetType
    ? CONFIG.jetSkis.filter(j => j.type === jetType)
    : []

  // Charger les jets occupés
  useEffect(() => {
    if (!requiresJet) return
    supabase.from('rentals')
      .select('jet_ski_id, end_time')
      .eq('status', 'active')
      .not('jet_ski_id', 'is', null)
      .then(({ data }) => {
        const map: Record<string, string> = {}
        data?.forEach(r => r.jet_ski_id?.split(',').forEach((id: string) => {
          map[id.trim()] = r.end_time
        }))
        setOccupiedJets(map)
      })
  }, [requiresJet])

  const endDate = new Date(new Date(startTime).getTime() + item.activity.durationMinutes * 60000)
  const endISO = endDate.toISOString()

  const canConfirm = !requiresJet || !!selectedJet

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
        <h3 className="text-lg font-bold text-gray-800 mb-1">▶️ {title}</h3>
        <p className="text-blue-700 font-semibold mb-1">
          {item.activity.name}
          {item.subtype ? ` — ${item.subtype}` : ''}
          {item.numberOfPersons && item.numberOfPersons > 1 ? ` (${item.numberOfPersons}p)` : ''}
        </p>
        <p className="text-gray-400 text-sm mb-4">{item.activity.duration}</p>

        <label className="block text-sm font-semibold text-gray-700 mb-1">🕐 Heure de départ</label>
        <input
          type="datetime-local"
          value={startTime}
          onChange={e => setStartTime(e.target.value)}
          className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 mb-3"
        />

        <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4 text-sm">
          <p className="text-green-800 font-medium">
            {fmt(startTime)} → {fmt(endISO)}
            <span className="text-green-500 ml-2">({item.activity.duration})</span>
          </p>
        </div>

        {/* ── Sélecteur jet ski (si activité jet ski) ── */}
        {requiresJet && jetsForType.length > 0 && (
          <div className={`rounded-xl p-3 mb-4 border ${selectedJet ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'}`}>
            <p className={`text-xs font-bold mb-2 ${selectedJet ? 'text-blue-700' : 'text-orange-700'}`}>
              🚤 Choisir le jet ski ({jetType})
              {!selectedJet && <span className="text-orange-500 ml-1">— requis</span>}
            </p>
            <div className="flex flex-wrap gap-2">
              {jetsForType.map(jet => {
                const isOccupied = !!occupiedJets[jet.id]
                const isSelected = selectedJet === jet.id
                return (
                  <button
                    key={jet.id}
                    onClick={() => !isOccupied && setSelectedJet(isSelected ? '' : jet.id)}
                    disabled={isOccupied}
                    title={isOccupied ? `Sorti — retour à ${fmt(occupiedJets[jet.id])}` : jet.name}
                    className={`px-3 py-2 rounded-xl border-2 text-sm font-bold transition-all flex items-center gap-1.5 ${
                      isOccupied
                        ? 'border-red-200 bg-red-50 text-red-400 opacity-60 cursor-not-allowed'
                        : isSelected
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-blue-200 bg-white text-blue-700 hover:border-blue-400'
                    }`}
                  >
                    <span>{isOccupied ? '❌' : isSelected ? '✅' : '🚤'}</span>
                    <span>{jet.name}</span>
                    {isOccupied && (
                      <span className="text-red-400 text-xs font-normal">{fmt(occupiedJets[jet.id])}</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-200">
            Annuler
          </button>
          <button
            onClick={() => canConfirm && onConfirm(new Date(startTime).toISOString(), endISO, selectedJet || undefined)}
            disabled={!canConfirm}
            className="flex-1 bg-green-600 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-green-700 disabled:opacity-40"
          >
            ▶️ Démarrer
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Panel attribution jet ski ───────────────────────────────
interface AssignPanelProps {
  rental: Rental
  onConfirm: () => void
  onCancel: () => void
}

function AssignJetPanel({ rental, onConfirm, onCancel }: AssignPanelProps) {
  const [selectedJet, setSelectedJet] = useState('')
  const [startTime, setStartTime] = useState(formatForInput(new Date()))
  const [submitting, setSubmitting] = useState(false)
  const [rentalMap, setRentalMap] = useState<Record<string, { endTime: string }>>({})

  const cartItems = rental.cart_items ?? []
  const jetItem = cartItems.find(item => item.activity.requiresJetSki)
  const jetType = jetItem?.activity.jetType ?? 'VX'
  const jets = CONFIG.jetSkis.filter(j => j.type === jetType)
  const durationMinutes = jetItem?.activity.durationMinutes ?? rental.duration_minutes ?? 30

  useEffect(() => {
    supabase.from('rentals').select('jet_ski_id, end_time').eq('status', 'active').not('jet_ski_id', 'is', null)
      .then(({ data }) => {
        const map: Record<string, { endTime: string }> = {}
        data?.forEach(r => { if (r.jet_ski_id) map[r.jet_ski_id] = { endTime: r.end_time } })
        setRentalMap(map)
      })
  }, [])

  const endDate = new Date(new Date(startTime).getTime() + durationMinutes * 60000)
  const endISO = endDate.toISOString()

  const handleConfirm = async () => {
    if (!selectedJet) return
    setSubmitting(true)
    try {
      await supabase.from('rentals').update({
        jet_ski_id: selectedJet,
        start_time: new Date(startTime).toISOString(),
        end_time: endISO,
        status: 'active',
      }).eq('id', rental.id)
      onConfirm()
    } catch (err) { console.error(err); alert('❌ Erreur') }
    setSubmitting(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
        <h3 className="text-lg font-bold text-gray-800 mb-4">🚤 Attribuer un jet ski</h3>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {jets.map(jet => {
            const isOccupied = !!rentalMap[jet.id]
            return (
              <button key={jet.id} onClick={() => !isOccupied && setSelectedJet(jet.id)} disabled={isOccupied}
                className={`p-3 rounded-xl border-2 text-center font-bold text-sm ${
                  isOccupied ? 'border-red-200 bg-red-50 text-red-400 cursor-not-allowed'
                    : selectedJet === jet.id ? 'border-green-500 bg-green-50 text-green-800'
                    : 'border-gray-200 bg-white text-gray-800 hover:border-green-400'
                }`}>
                <div className="text-2xl mb-1">🚤</div>
                <div>{jet.name}</div>
                <div className={`text-xs mt-0.5 ${isOccupied ? 'text-red-400' : 'text-green-500'}`}>
                  {isOccupied ? `Retour ${fmt(rentalMap[jet.id].endTime)}` : 'Disponible'}
                </div>
              </button>
            )
          })}
        </div>
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-1">🕐 Heure de départ</label>
          <input type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        {selectedJet && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4 text-sm">
            <p className="text-green-800 font-medium">🚤 {selectedJet} · {fmt(startTime)} → {fmt(endISO)}</p>
          </div>
        )}
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl text-sm font-medium">Annuler</button>
          <button onClick={handleConfirm} disabled={!selectedJet || submitting}
            className="flex-1 bg-green-600 text-white py-2.5 rounded-xl text-sm font-bold disabled:opacity-40 hover:bg-green-700">
            {submitting ? '...' : '▶️ Démarrer'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Composant principal ─────────────────────────────────────
export default function ActiveRentals({ onNewRental }: Props) {
  const [rentals, setRentals] = useState<Rental[]>([])
  const [pendingJetRentals, setPendingJetRentals] = useState<Rental[]>([])
  const [waiting, setWaiting] = useState<WaitingEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [returnAlert, setReturnAlert] = useState<{ jetId: string; waiters: WaitingEntry[] } | null>(null)
  const [assigningRental, setAssigningRental] = useState<Rental | null>(null)
  // Modal modification location active
  const [editingRental, setEditingRental] = useState<Rental | null>(null)
  // Popup "démarrer l'activité suivante ?"
  const [startNextPanel, setStartNextPanel] = useState<{ rental: Rental; item: CartItem } | null>(null)
  // Popup démarrage manuel d'une activité en attente
  const [startItemPanel, setStartItemPanel] = useState<{ rental: Rental; item: CartItem } | null>(null)
  // Modal paiement en attente
  const [payingRental, setPayingRental] = useState<Rental | null>(null)
  const [payingMethod, setPayingMethod] = useState('')

  // ── Modal RETARD ──────────────────────────────────────────
  const [lateFees, setLateFees] = useState<LateFee[]>([])
  const [lateModal, setLateModal] = useState(false)
  const [lateAmount, setLateAmount] = useState('')
  const [lateComment, setLateComment] = useState('')
  const [lateRentalId, setLateRentalId] = useState('')
  const [latePayment, setLatePayment] = useState('')
  const [lateSaving, setLateSaving] = useState(false)
  const [lateRentalOptions, setLateRentalOptions] = useState<RentalOption[]>([])

  const fetchAll = useCallback(async () => {
    const [activeRes, pendingRes, waitingRes, lateFeesRes] = await Promise.all([
      supabase.from('rentals').select('*').eq('status', 'active').order('start_time', { ascending: true }),
      supabase.from('rentals').select('*').eq('status', 'pending_jet').order('created_at', { ascending: true }),
      supabase.from('waiting_list').select('*').eq('status', 'waiting').order('created_at', { ascending: true }),
      supabase.from('late_fees').select('*').order('created_at', { ascending: false }),
    ])
    setRentals(activeRes.data || [])
    setPendingJetRentals(pendingRes.data || [])
    setWaiting(waitingRes.data || [])
    setLateFees(lateFeesRes.data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchAll()
    const interval = setInterval(fetchAll, 30000)
    return () => clearInterval(interval)
  }, [fetchAll])

  // ── Ouvrir la modal RETARD ────────────────────────────────
  const openLateModal = async () => {
    // Charger locations actives + archivées récentes (7 jours)
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const [activeRes, archivedRes] = await Promise.all([
      supabase.from('rentals').select('id, client_firstname, client_name, activity_name')
        .in('status', ['active', 'pending_jet']).order('start_time', { ascending: false }),
      supabase.from('rentals').select('id, client_firstname, client_name, activity_name, created_at')
        .eq('status', 'archived').gte('created_at', since)
        .order('created_at', { ascending: false }).limit(30),
    ])
    const opts: RentalOption[] = [
      ...(activeRes.data || []).map(r => ({
        id: r.id,
        label: `🟡 ${r.client_firstname} ${r.client_name} — ${r.activity_name} (en cours)`,
      })),
      ...(archivedRes.data || []).map(r => ({
        id: r.id,
        label: `📁 ${r.client_firstname} ${r.client_name} — ${r.activity_name} (${fmtDate(r.created_at)})`,
      })),
    ]
    setLateRentalOptions(opts)
    setLateModal(true)
  }

  // ── Enregistrer un frais de retard ────────────────────────
  const handleSaveLate = async () => {
    const amount = parseFloat(lateAmount)
    if (!amount || amount <= 0) return
    setLateSaving(true)
    // Récupérer le nom client si une location est liée
    const linked = lateRentalOptions.find(o => o.id === lateRentalId)
    const clientName = linked
      ? linked.label.replace(/^[🟡📁]\s/, '').split(' —')[0].trim()
      : null
    const { error } = await supabase.from('late_fees').insert({
      amount,
      comment:        lateComment.trim() || null,
      rental_id:      lateRentalId || null,
      client_name:    clientName,
      payment_method: latePayment || null,
    })
    if (error) { alert('❌ Erreur lors de l\'enregistrement.'); setLateSaving(false); return }
    setLateAmount('')
    setLateComment('')
    setLateRentalId('')
    setLatePayment('')
    setLateModal(false)
    setLateSaving(false)
    fetchAll()
  }

  // ── Encaisser un paiement en attente ──────────────────────
  const handlePayNow = async (method: string) => {
    if (!payingRental || !method) return
    const { error } = await supabase
      .from('rentals')
      .update({
        payment_method: method,
        status: 'archived',   // ← ferme et archive la location au moment du paiement
      })
      .eq('id', payingRental.id)
    if (error) { alert('❌ Erreur lors du paiement.'); return }
    setPayingRental(null)
    setPayingMethod('')
    fetchAll()
  }

  // ── Démarrer une activité ─────────────────────────────────
  const handleStartItem = async (
    rental: Rental,
    item: CartItem,
    startTimeISO: string,
    endTimeISO: string,
    jetSkiId?: string   // ← NOUVEAU : jet assigné au moment du démarrage
  ) => {
    const cart = rental.cart_items ?? []
    const updatedCart: CartItem[] = cart.map(i =>
      i.cartId === item.cartId
        ? {
            ...i,
            itemStatus: 'active' as ItemStatus,
            itemStartTime: startTimeISO,
            itemEndTime: endTimeISO,
            assignedJetSkiId: jetSkiId || i.assignedJetSkiId,
          }
        : i
    )

    // Recalculer end_time global
    const activeItems = updatedCart.filter(i => i.itemStatus === 'active' && i.itemEndTime)
    const newEnd = activeItems.reduce((max, i) => (i.itemEndTime! > max ? i.itemEndTime! : max), endTimeISO)

    // Recalculer jet_ski_id global (tous les jets assignés actifs)
    const allJetIds = updatedCart
      .filter(i => i.itemStatus === 'active' && (i as any).assignedJetSkiId)
      .map(i => (i as any).assignedJetSkiId as string)
    const newJetSkiId = allJetIds.length > 0 ? allJetIds.join(',') : rental.jet_ski_id

    await supabase.from('rentals').update({
      cart_items: updatedCart,
      start_time: rental.start_time ?? startTimeISO,
      end_time: newEnd,
      jet_ski_id: newJetSkiId || null,
    }).eq('id', rental.id)

    setStartNextPanel(null)
    setStartItemPanel(null)
    fetchAll()
  }

  // ── Rendre une activité ───────────────────────────────────
  const handleReturnItem = async (rental: Rental, cartId: string) => {
    const cart: CartItem[] = rental.cart_items ?? []

    // Trouver l'item rendu (pour libérer son jet)
    const returnedItem = cart.find(i => i.cartId === cartId)

    const updatedCart: CartItem[] = cart.map(i =>
      i.cartId === cartId
        ? { ...i, itemStatus: 'returned' as ItemStatus }
        : i
    )

    const allReturned = updatedCart.every(i => i.itemStatus === 'returned')
    const waitingItems = updatedCart.filter(i => i.itemStatus === 'waiting')
    const returnedIds = updatedCart.filter(i => i.itemStatus === 'returned').map(i => i.cartId)

    // ── Recalculer jet_ski_id : garder seulement les jets encore actifs ──
    const stillActiveJets = updatedCart
      .filter(i => i.itemStatus === 'active' && i.assignedJetSkiId)
      .map(i => i.assignedJetSkiId!)
    const newJetSkiId = stillActiveJets.length > 0 ? stillActiveJets.join(',') : null

    if (allReturned) {
      if (rental.payment_method === PENDING_PAYMENT) {
        // ── Paiement en attente : on libère le jet mais on GARDE la carte visible ──
        // La carte disparaîtra seulement quand l'utilisateur cliquera sur "💳 Payer"
        await supabase.from('rentals').update({
          cart_items: updatedCart,
          returned_cart_ids: returnedIds,
          jet_ski_id: null,   // ← jet libéré, disponible pour d'autres
          // status reste 'active' → carte toujours visible en orange
        }).eq('id', rental.id)
      } else {
        // ── Tout est rendu ET payé → archiver normalement ──
        await supabase.from('rentals').update({
          cart_items: updatedCart,
          status: 'archived',
          returned_cart_ids: returnedIds,
          jet_ski_id: null,
        }).eq('id', rental.id)
      }

      // Vérifier file d'attente pour le jet libéré
      if (returnedItem?.assignedJetSkiId) {
        const waiters = waiting.filter(w => w.jet_ski_id === returnedItem.assignedJetSkiId)
        if (waiters.length > 0) setReturnAlert({ jetId: returnedItem.assignedJetSkiId, waiters })
      } else if (rental.jet_ski_id) {
        const waiters = waiting.filter(w => w.jet_ski_id === rental.jet_ski_id)
        if (waiters.length > 0) setReturnAlert({ jetId: rental.jet_ski_id, waiters })
      }
    } else {
      await supabase.from('rentals').update({
        cart_items: updatedCart,
        returned_cart_ids: returnedIds,
        jet_ski_id: newJetSkiId,   // ← libère immédiatement le jet rendu
      }).eq('id', rental.id)

      // Vérifier file d'attente pour le jet libéré
      if (returnedItem?.assignedJetSkiId) {
        const waiters = waiting.filter(w => w.jet_ski_id === returnedItem.assignedJetSkiId)
        if (waiters.length > 0) setReturnAlert({ jetId: returnedItem.assignedJetSkiId, waiters })
      }

      // S'il reste des activités en attente → proposer de démarrer la prochaine
      if (waitingItems.length > 0) {
        const updatedRental: Rental = { ...rental, cart_items: updatedCart }
        setStartNextPanel({ rental: updatedRental, item: waitingItems[0] })
      }
    }

    fetchAll()
  }

  const handleCancelWaiting = async (id: string) => {
    await supabase.from('waiting_list').update({ status: 'cancelled' }).eq('id', id)
    fetchAll()
  }

  const handleConvertWaiting = async (entry: WaitingEntry) => {
    await supabase.from('waiting_list').update({ status: 'converted' }).eq('id', entry.id)
    setReturnAlert(null)
    onNewRental()
  }

  const handleCancelPendingJet = async (id: string) => {
    if (!confirm('Annuler cette location ?')) return
    await supabase.from('rentals').update({ status: 'archived' }).eq('id', id)
    fetchAll()
  }

  if (loading) return <div className="text-center py-16 text-gray-400">⏳ Chargement...</div>

  const hasAnything = rentals.length > 0 || pendingJetRentals.length > 0 || waiting.length > 0

  return (
    <div>
      {/* ── Popups ── */}

      {/* Modal modification location active */}
      {editingRental && (
        <EditRentalModal
          rental={editingRental}
          onClose={() => setEditingRental(null)}
          onSaved={() => { setEditingRental(null); fetchAll() }}
        />
      )}

      {/* Attribution jet ski */}
      {assigningRental && (
        <AssignJetPanel rental={assigningRental}
          onConfirm={() => { setAssigningRental(null); fetchAll() }}
          onCancel={() => setAssigningRental(null)} />
      )}

      {/* Démarrer l'activité suivante (après rendu) */}
      {startNextPanel && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">🔔</div>
              <h3 className="text-lg font-bold text-blue-700">Activité suivante prête !</h3>
              <p className="text-gray-500 text-sm mt-1">
                {startNextPanel.rental.client_firstname} {startNextPanel.rental.client_name}
              </p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4">
              <p className="text-blue-800 font-semibold">
                {startNextPanel.item.activity.name}
                {startNextPanel.item.subtype ? ` — ${startNextPanel.item.subtype}` : ''}
              </p>
              <p className="text-blue-600 text-sm">{startNextPanel.item.activity.duration}</p>
            </div>
            <p className="text-gray-600 text-sm text-center mb-4">Voulez-vous démarrer cette activité maintenant ?</p>
            <div className="flex gap-2">
              <button onClick={() => setStartNextPanel(null)}
                className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-200">
                Plus tard
              </button>
              <button
                onClick={() => {
                  // Passer au panel de démarrage
                  setStartItemPanel(startNextPanel)
                  setStartNextPanel(null)
                }}
                className="flex-1 bg-green-600 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-green-700">
                ▶️ Démarrer maintenant
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Panel démarrage activité */}
      {startItemPanel && (
        <StartItemPanel
          item={startItemPanel.item}
          title="Démarrer l'activité"
          onConfirm={(startTimeISO, endTimeISO, jetSkiId) =>
            handleStartItem(startItemPanel.rental, startItemPanel.item, startTimeISO, endTimeISO, jetSkiId)
          }
          onCancel={() => setStartItemPanel(null)}
        />
      )}

      {/* Popup file d'attente au retour */}
      {returnAlert && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <div className="text-center mb-4">
              <div className="text-5xl mb-3">🔔</div>
              <h3 className="text-xl font-bold text-orange-700">File d'attente !</h3>
              <p className="text-gray-600 text-sm mt-1">Le jet <strong>{returnAlert.jetId}</strong> vient d'être rendu.</p>
            </div>
            <div className="space-y-3 mb-5">
              {returnAlert.waiters.map((waiter, i) => (
                <div key={waiter.id} className="bg-orange-50 border border-orange-200 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-orange-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">{i + 1}</span>
                    <p className="font-bold text-orange-800">{waiter.client_firstname} {waiter.client_name}</p>
                  </div>
                  <p className="text-orange-600 text-sm">{waiter.client_phone}</p>
                  {i === 0 && (
                    <button onClick={() => handleConvertWaiting(waiter)} className="w-full mt-2 bg-green-500 text-white py-2 rounded-xl text-sm font-bold hover:bg-green-600">
                      ➕ Démarrer sa location
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button onClick={() => setReturnAlert(null)} className="w-full bg-gray-100 text-gray-700 py-2.5 rounded-xl font-medium">Fermer</button>
          </div>
        </div>
      )}

      {/* ── Modal paiement en attente ── */}
      {payingRental && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold text-gray-800 mb-1">💳 Encaisser le paiement</h3>
            <p className="text-gray-500 text-sm mb-1">{payingRental.client_firstname} {payingRental.client_name}</p>
            <p className="text-3xl font-bold text-gray-800 mb-5">{payingRental.price.toLocaleString()} {CONFIG.currency}</p>
            <div className="space-y-3 mb-6">
              {CONFIG.paymentMethods.map(method => (
                <button
                  key={method}
                  onClick={() => setPayingMethod(method)}
                  className={`w-full p-3.5 rounded-xl border-2 text-left flex items-center gap-3 transition-all ${
                    payingMethod === method
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 bg-white hover:border-green-300'
                  }`}
                >
                  <span className="text-2xl">{PAYMENT_ICONS[method]}</span>
                  <span className="font-semibold text-gray-800">{method}</span>
                  {payingMethod === method && <span className="ml-auto text-green-500 text-xl">✓</span>}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setPayingRental(null); setPayingMethod('') }}
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200">
                Annuler
              </button>
              <button onClick={() => handlePayNow(payingMethod)} disabled={!payingMethod}
                className="flex-1 bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 disabled:opacity-40">
                ✅ Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal RETARD ── */}
      {lateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold text-gray-800 mb-1">⏰ Frais de retard</h3>
            <p className="text-gray-400 text-xs mb-5">Ce montant s'ajoutera au CA sous la catégorie "Retard"</p>

            {/* Montant */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">💰 Montant ({CONFIG.currency}) *</label>
              <div className="flex items-center border-2 border-gray-300 rounded-xl overflow-hidden focus-within:border-red-500">
                <input type="number" min="0" step="1" placeholder="ex: 200"
                  value={lateAmount} onChange={e => setLateAmount(e.target.value)}
                  className="flex-1 px-4 py-3 text-xl font-bold text-gray-800 outline-none" />
                <span className="px-4 text-gray-400 font-semibold bg-gray-50 border-l border-gray-200 py-3">{CONFIG.currency}</span>
              </div>
            </div>

            {/* Commentaire */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">💬 Commentaire (optionnel)</label>
              <input type="text" placeholder="ex: 30 min de dépassement"
                value={lateComment} onChange={e => setLateComment(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-red-400" />
            </div>

            {/* Lier à une location */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">📋 Lier à une location (optionnel)</label>
              <select value={lateRentalId} onChange={e => setLateRentalId(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-red-400">
                <option value="">— Aucune location sélectionnée —</option>
                {lateRentalOptions.map(o => (
                  <option key={o.id} value={o.id}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* Mode de paiement */}
            <div className="mb-5">
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">💳 Mode de paiement (optionnel)</label>
              <div className="grid grid-cols-3 gap-2">
                {CONFIG.paymentMethods.map(m => {
                  const icons: Record<string, string> = { 'Espèces': '💵', 'Carte bancaire': '💳', 'Virement': '🏦' }
                  return (
                    <button key={m} onClick={() => setLatePayment(latePayment === m ? '' : m)}
                      className={`py-2 rounded-xl border-2 text-xs font-semibold flex flex-col items-center gap-0.5 transition-all ${
                        latePayment === m ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 text-gray-600 hover:border-red-300'
                      }`}>
                      <span className="text-lg">{icons[m] || '💰'}</span>
                      <span>{m}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => { setLateModal(false); setLateAmount(''); setLateComment(''); setLateRentalId(''); setLatePayment('') }}
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200">
                Annuler
              </button>
              <button onClick={handleSaveLate} disabled={!lateAmount || parseFloat(lateAmount) <= 0 || lateSaving}
                className="flex-1 bg-red-500 text-white py-3 rounded-xl font-bold hover:bg-red-600 disabled:opacity-40 transition-colors">
                {lateSaving ? '⏳...' : '⏰ Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Locations actives</h2>
          <p className="text-gray-500 text-sm mt-1">
            {fmtDate(new Date().toISOString())} · {rentals.length} en cours
            {pendingJetRentals.length > 0 && <span className="ml-2 text-yellow-600 font-medium">· {pendingJetRentals.length} en attente de jet</span>}
            {waiting.length > 0 && <span className="ml-2 text-orange-600 font-medium">· {waiting.length} en file d'attente</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={openLateModal}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2.5 rounded-xl font-semibold shadow flex items-center gap-1.5 transition-colors">
            ⏰ Retard
          </button>
          <button onClick={onNewRental} className="bg-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-blue-800 shadow">
            ➕ Nouvelle
          </button>
        </div>
      </div>

      {!hasAnything ? (
        <div className="text-center py-20">
          <div className="text-7xl mb-4">🌊</div>
          <p className="text-xl text-gray-500 font-medium">Aucune location en cours</p>
          <button onClick={onNewRental} className="mt-6 bg-blue-700 text-white px-8 py-3 rounded-xl font-semibold hover:bg-blue-800">➕ Démarrer une location</button>
        </div>
      ) : (
        <>
          {/* ── En attente de jet ski ── */}
          {pendingJetRentals.length > 0 && (
            <div className="mb-6">
              <h3 className="text-base font-bold text-yellow-700 mb-3">🟡 En attente de jet ski ({pendingJetRentals.length})</h3>
              <div className="space-y-3">
                {pendingJetRentals.map(rental => {
                  const activities = (rental.cart_items ?? []).map(item => {
                    let s = item.activity.name
                    if (item.subtype) s += ` — ${item.subtype}`
                    if (item.numberOfPersons && item.numberOfPersons > 1) s += ` (${item.numberOfPersons}p)`
                    return s
                  }).join(' + ') || rental.activity_name
                  return (
                    <div key={rental.id} className="bg-white border-2 border-yellow-300 rounded-2xl p-4 shadow-sm">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-bold text-gray-800 text-lg">{rental.client_firstname} {rental.client_name}</h4>
                          <p className="text-gray-500 text-sm">{rental.client_phone}</p>
                        </div>
                        <span className="bg-yellow-100 text-yellow-700 text-xs font-bold px-3 py-1 rounded-full">🟡 En attente</span>
                      </div>
                      <p className="text-gray-600 text-sm mb-3">{activities}</p>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xl">{rental.price.toLocaleString()} {CONFIG.currency}</span>
                        <div className="flex gap-2">
                          <button onClick={() => handleCancelPendingJet(rental.id)} className="text-red-400 border border-red-200 px-3 py-2 rounded-xl text-sm hover:bg-red-50">Annuler</button>
                          <button onClick={() => setAssigningRental(rental)} className="bg-green-600 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-green-700">▶️ Attribuer & Démarrer</button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Locations actives ── */}
          {rentals.length > 0 && (
            <div className="grid gap-4 mb-6">
              {rentals.map(rental => {
                const cartItems: CartItem[] = rental.cart_items ?? []
                const hasCart = cartItems.length > 0

                // Check si au moins un item actif est en retard
                const isOverdue = hasCart
                  ? cartItems.some(i => i.itemStatus === 'active' && i.itemEndTime && new Date(i.itemEndTime) < new Date())
                  : rental.end_time ? new Date(rental.end_time) < new Date() : false

                const isPendingPayment = rental.payment_method === PENDING_PAYMENT
                return (
                  <div key={rental.id} className={`bg-white rounded-2xl shadow-sm border-2 p-5 ${
                    isPendingPayment ? 'border-orange-400' : isOverdue ? 'border-red-300' : 'border-gray-100'
                  }`}>
                    {isPendingPayment && (() => {
                      const cartItems2: CartItem[] = rental.cart_items ?? []
                      const allJetsReturned = cartItems2.length > 0 && cartItems2.every(i => i.itemStatus === 'returned')
                      return (
                        <div className={`text-xs font-semibold px-3 py-1.5 rounded-lg mb-3 inline-flex items-center gap-1.5 ${
                          allJetsReturned
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-orange-50 text-orange-700'
                        }`}>
                          {allJetsReturned
                            ? '✅ Jet rendu · 💳 En attente du paiement'
                            : `⏳ Paiement en attente · ${rental.price.toLocaleString()} ${CONFIG.currency}`}
                        </div>
                      )
                    })()}
                    {isOverdue && !isPendingPayment && (
                      <div className="bg-red-50 text-red-600 text-xs font-semibold px-3 py-1 rounded-lg mb-3 inline-block">⚠️ Dépassement horaire</div>
                    )}

                    {/* Header client */}
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-gray-800 text-lg">{rental.client_firstname} {rental.client_name}</h3>
                        <p className="text-gray-500 text-sm">{rental.client_phone}</p>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-xl text-gray-800">{rental.price.toLocaleString()} {CONFIG.currency}</span>
                        <p className={`text-xs font-medium ${isPendingPayment ? 'text-orange-500' : 'text-gray-400'}`}>
                          {rental.payment_method}
                        </p>
                      </div>
                    </div>

                    <p className="text-gray-400 text-xs mb-2">📋 {rental.contract_number} {rental.jet_ski_id ? `· 🚤 ${rental.jet_ski_id}` : ''}</p>

                    {/* ── Frais de retard liés à cette location ── */}
                    {(() => {
                      const fees = lateFees.filter(lf => lf.rental_id === rental.id)
                      if (fees.length === 0) return null
                      const total = fees.reduce((s, lf) => s + lf.amount, 0)
                      return (
                        <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 mb-3">
                          <p className="text-red-700 text-xs font-bold mb-1">⏰ Frais de retard : +{total.toLocaleString()} {CONFIG.currency}</p>
                          {fees.map(lf => lf.comment && (
                            <p key={lf.id} className="text-red-500 text-xs">• {lf.comment}</p>
                          ))}
                        </div>
                      )
                    })()}

                    {/* ── Activités par activité avec départs décalés ── */}
                    {hasCart ? (
                      <div className="space-y-2">
                        {cartItems.map(item => {
                          const status: ItemStatus = item.itemStatus ?? 'active'
                          const itemOverdue = status === 'active' && item.itemEndTime && new Date(item.itemEndTime) < new Date()

                          return (
                            <div key={item.cartId} className={`rounded-xl p-3 border ${
                              status === 'returned' ? 'bg-gray-50 border-gray-200 opacity-60'
                                : status === 'waiting' ? 'bg-orange-50 border-orange-200'
                                : itemOverdue ? 'bg-red-50 border-red-200'
                                : 'bg-white border-blue-100'
                            }`}>
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className={`font-semibold text-sm ${status === 'returned' ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                                    {item.activity.name}
                                    {item.subtype ? ` — ${item.subtype}` : ''}
                                    {item.numberOfPersons && item.numberOfPersons > 1 ? ` (${item.numberOfPersons}p)` : ''}
                                  </p>

                                  {/* Horaires si actif */}
                                  {status === 'active' && item.itemStartTime && item.itemEndTime && (
                                    <p className={`text-xs mt-0.5 font-medium ${itemOverdue ? 'text-red-500' : 'text-blue-600'}`}>
                                      🕐 {fmt(item.itemStartTime)} → {fmt(item.itemEndTime)}
                                      {itemOverdue && ' ⚠️'}
                                    </p>
                                  )}

                                  {/* En attente */}
                                  {status === 'waiting' && (
                                    <p className="text-orange-500 text-xs mt-0.5">⏳ En attente de départ</p>
                                  )}

                                  <p className="text-gray-400 text-xs">{item.activity.duration} · {item.itemPrice.toLocaleString()} {CONFIG.currency}</p>

                                  {/* Numéro de jet ski */}
                                  {item.activity.requiresJetSki && (
                                    item.assignedJetSkiId
                                      ? <p className="text-blue-600 text-xs font-semibold mt-0.5">🚤 {item.assignedJetSkiId}</p>
                                      : status !== 'returned' && <p className="text-gray-400 text-xs mt-0.5">🚤 Jet à définir</p>
                                  )}
                                </div>

                                {/* Boutons selon statut */}
                                <div className="flex-shrink-0">
                                  {status === 'returned' && (
                                    <span className="text-green-600 text-xs font-bold bg-green-50 px-2 py-1 rounded-lg">✅ Rendu</span>
                                  )}
                                  {status === 'waiting' && (
                                    <button
                                      onClick={() => setStartItemPanel({ rental, item })}
                                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                                    >
                                      ▶️ Démarrer
                                    </button>
                                  )}
                                  {status === 'active' && (
                                    <button
                                      onClick={() => handleReturnItem(rental, item.cartId)}
                                      className={`text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                                        itemOverdue ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'
                                      }`}
                                    >
                                      ✅ Rendu
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      /* Ancienne location sans cart */
                      <div className={`rounded-xl p-3 mb-3 ${isOverdue ? 'bg-red-50' : 'bg-blue-50'}`}>
                        <p className="text-sm font-semibold text-gray-700">{rental.activity_name}</p>
                        <p className={`text-sm mt-1 ${isOverdue ? 'text-red-600' : 'text-blue-600'}`}>
                          🕐 {rental.start_time ? fmt(rental.start_time) : '--:--'} → {rental.end_time ? fmt(rental.end_time) : '--:--'}
                        </p>
                      </div>
                    )}

                    {/* Boutons Payer + Modifier */}
                    <div className="mt-3 pt-3 border-t border-gray-100 flex justify-end gap-2">
                      {isPendingPayment && (
                        <button
                          onClick={() => { setPayingRental(rental); setPayingMethod('') }}
                          className="flex items-center gap-1.5 text-green-700 bg-green-50 hover:bg-green-100 border border-green-300 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                        >
                          💳 Payer
                        </button>
                      )}
                      <button
                        onClick={() => setEditingRental(rental)}
                        className="flex items-center gap-1.5 text-orange-600 bg-orange-50 hover:bg-orange-100 border border-orange-200 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                      >
                        ✏️ Modifier
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* ── File d'attente ── */}
          {waiting.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-gray-700 mb-3">⏳ File d'attente ({waiting.length})</h3>
              <div className="space-y-3">
                {waiting.map((entry, i) => (
                  <div key={entry.id} className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="bg-orange-500 text-white font-bold w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0">{i + 1}</div>
                        <div>
                          <p className="font-bold text-orange-900">{entry.client_firstname} {entry.client_name}</p>
                          <p className="text-orange-600 text-sm">{entry.client_phone}</p>
                          <span className="bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded-lg">🚤 Attend {entry.jet_ski_id}</span>
                        </div>
                      </div>
                      <button onClick={() => handleCancelWaiting(entry.id)} className="text-gray-400 hover:text-red-500 text-xl ml-2">✕</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
