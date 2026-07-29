import { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { CONFIG, ActivityConfig } from '../config'
import { Rental, CartItem } from '../types'

const newCartId = () => Math.random().toString(36).slice(2, 10)

const ICONS: Record<string, string> = {
  'Jet Ski VX': '🚤', 'Jet Ski FX': '🚤',
  'Bouée Tractée': '🔵', 'Ski Nautique': '🎿',
  'Wakeboard': '🏄', 'Paddle': '🛶',
  'Kayak': '🚣', 'Scooter sous-marin': '🤿',
}

interface Props {
  rental: Rental
  onClose: () => void
  onSaved: () => void
}

// ── Helpers ────────────────────────────────────────────────
const toTime = (iso: string | null | undefined): string => {
  if (!iso) return ''
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const addMinutes = (timeStr: string, mins: number): string => {
  const [h, m] = timeStr.split(':').map(Number)
  const total = h * 60 + m + mins
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

// ── Signature Pad ───────────────────────────────────────────
function SignaturePad({ onSign }: { onSign: (sig: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing   = useRef(false)
  const [signed, setSigned] = useState(false)

  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect()
    const src  = 'touches' in e ? e.touches[0] : e
    return { x: src.clientX - rect.left, y: src.clientY - rect.top }
  }
  const start = (e: React.MouseEvent | React.TouchEvent) => {
    const ctx = canvasRef.current!.getContext('2d')!
    const pos = getPos(e, canvasRef.current!)
    ctx.beginPath(); ctx.moveTo(pos.x, pos.y)
    drawing.current = true
  }
  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing.current) return
    e.preventDefault()
    const ctx = canvasRef.current!.getContext('2d')!
    const pos = getPos(e, canvasRef.current!)
    ctx.lineTo(pos.x, pos.y)
    ctx.strokeStyle = '#1d4ed8'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.stroke()
  }
  const stop = () => {
    drawing.current = false
    setSigned(true); onSign(canvasRef.current!.toDataURL('image/png'))
  }
  const clear = () => {
    canvasRef.current!.getContext('2d')!.clearRect(0, 0, 500, 140)
    setSigned(false); onSign('')
  }

  return (
    <div>
      <div className="border-2 border-blue-300 rounded-xl overflow-hidden bg-white">
        <canvas ref={canvasRef} width={500} height={140}
          className="w-full touch-none cursor-crosshair" style={{ maxHeight: 140 }}
          onMouseDown={start} onMouseMove={draw} onMouseUp={stop} onMouseLeave={stop}
          onTouchStart={start} onTouchMove={draw} onTouchEnd={stop} />
      </div>
      <div className="flex justify-between items-center mt-1.5">
        <span className={`text-xs font-medium ${signed ? 'text-green-600' : 'text-gray-400'}`}>
          {signed ? '✅ Signature enregistrée' : 'Signez dans le cadre ci-dessus'}
        </span>
        {signed && <button onClick={clear} className="text-xs text-red-400 hover:text-red-600 underline">Effacer</button>}
      </div>
    </div>
  )
}

// ── Composant principal ────────────────────────────────────
export default function EditRentalModal({ rental, onClose, onSaved }: Props) {
  // Infos client
  const [clientName,      setClientName]      = useState(rental.client_name)
  const [clientFirstname, setClientFirstname] = useState(rental.client_firstname)
  const [clientPhone,     setClientPhone]     = useState(rental.client_phone || '')
  const [clientIdNumber,  setClientIdNumber]  = useState(rental.client_id_number || '')
  const [paymentMethod,   setPaymentMethod]   = useState(rental.payment_method || '')
  const [signature,       setSignature]       = useState('')
  const [saving,          setSaving]          = useState(false)

  // Panier
  const initCart = (): CartItem[] => {
    if (rental.cart_items && rental.cart_items.length > 0) return rental.cart_items
    const activity = CONFIG.activities.find(a => a.id === rental.activity_id)
      || CONFIG.activities.find(a => a.name === rental.activity_name)
    if (activity) return [{
      cartId: newCartId(), activity,
      subtype: rental.activity_subtype || undefined,
      itemPrice: rental.price,
      itemStartTime: rental.start_time,
      itemEndTime: rental.end_time,
    }]
    return []
  }
  const [cart, setCart] = useState<CartItem[]>(initCart)

  // ── Jets : un par activité jet ski (cartId → jetId) ──────
  const initJetAssignments = (): Record<string, string> => {
    const result: Record<string, string> = {}
    const initialCart = initCart()
    initialCart.forEach(item => {
      if (item.activity.requiresJetSki && item.assignedJetSkiId) {
        result[item.cartId] = item.assignedJetSkiId
      }
    })
    // Fallback : si jet_ski_id existe et 1 seule activité jet
    if (Object.keys(result).length === 0 && rental.jet_ski_id) {
      const jetIds = rental.jet_ski_id.split(',').map(s => s.trim())
      const jetItems = initialCart.filter(i => i.activity.requiresJetSki)
      jetItems.forEach((item, idx) => {
        if (jetIds[idx]) result[item.cartId] = jetIds[idx]
      })
    }
    return result
  }
  const [jetAssignments, setJetAssignments] = useState<Record<string, string>>(initJetAssignments)

  // ── Horaires : un par activité (cartId → { start, end }) ─
  const baseDate = rental.start_time
    ? new Date(rental.start_time).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10)

  const initSchedules = (): Record<string, { start: string; end: string }> => {
    const result: Record<string, { start: string; end: string }> = {}
    const initialCart = initCart()
    initialCart.forEach(item => {
      result[item.cartId] = {
        start: toTime(item.itemStartTime) || toTime(rental.start_time) || '',
        end:   toTime(item.itemEndTime)   || toTime(rental.end_time)   || '',
      }
    })
    return result
  }
  const [schedules, setSchedules] = useState<Record<string, { start: string; end: string }>>(initSchedules)

  // Ajout d'une activité
  const [addActivityId, setAddActivityId] = useState('')
  const [addSubtype,    setAddSubtype]    = useState('')

  // Jets occupés par d'autres locations (sauf celle-ci)
  const [rentalMap, setRentalMap] = useState<Record<string, string>>({})
  useEffect(() => {
    supabase
      .from('rentals')
      .select('jet_ski_id, client_firstname, client_name')
      .eq('status', 'active')
      .not('jet_ski_id', 'is', null)
      .neq('id', rental.id)
      .then(({ data }) => {
        const map: Record<string, string> = {}
        data?.forEach(r => {
          r.jet_ski_id?.split(',').forEach((id: string) => {
            map[id.trim()] = `${r.client_firstname} ${r.client_name}`
          })
        })
        setRentalMap(map)
      })
  }, [rental.id])

  const totalPrice = cart.reduce((sum, item) => sum + item.itemPrice, 0)
  const jetSkiItems = cart.filter(item => item.activity.requiresJetSki)
  const hasJetActivity = jetSkiItems.length > 0

  const grouped = CONFIG.activities.reduce((acc, act) => {
    if (!acc[act.name]) acc[act.name] = []
    acc[act.name].push(act)
    return acc
  }, {} as Record<string, ActivityConfig[]>)

  const selectedNewActivity = CONFIG.activities.find(a => a.id === addActivityId)

  // Ajouter au panier
  const handleAddActivity = () => {
    if (!selectedNewActivity) return
    if (selectedNewActivity.hasSubtype && !addSubtype) { alert('Choisissez un type de bouée'); return }
    const newId = newCartId()
    setCart(prev => [...prev, {
      cartId: newId,
      activity: selectedNewActivity,
      subtype: addSubtype || undefined,
      itemPrice: selectedNewActivity.price,
      itemStartTime: null,
      itemEndTime: null,
    }])
    // Initialise horaires vides pour ce nouvel item
    setSchedules(prev => ({ ...prev, [newId]: { start: '', end: '' } }))
    setAddActivityId('')
    setAddSubtype('')
  }

  const handleRemoveItem = (cartId: string) => {
    setCart(prev => prev.filter(i => i.cartId !== cartId))
    setJetAssignments(prev => { const c = { ...prev }; delete c[cartId]; return c })
    setSchedules(prev => { const c = { ...prev }; delete c[cartId]; return c })
  }

  // Assign jet for a specific item
  const assignJet = (cartId: string, jetId: string) => {
    setJetAssignments(prev => ({
      ...prev,
      [cartId]: prev[cartId] === jetId ? '' : jetId,  // toggle
    }))
  }

  // Auto-calculer l'heure de fin à partir du début
  const autoEnd = (cartId: string, item: CartItem) => {
    const start = schedules[cartId]?.start
    if (!start) return
    const endTime = addMinutes(start, item.activity.durationMinutes)
    setSchedules(prev => ({ ...prev, [cartId]: { ...prev[cartId], end: endTime } }))
  }

  // Jets déjà assignés dans CETTE location (pour éviter doublons)
  const allAssigned = Object.values(jetAssignments).filter(Boolean)

  const allJetsAssigned = jetSkiItems.every(item => !!jetAssignments[item.cartId])

  const canSave = clientName.trim() && clientFirstname.trim() && cart.length > 0
    && paymentMethod && signature.trim()
    && (!hasJetActivity || allJetsAssigned)

  const handleSave = async () => {
    if (!canSave) {
      if (!signature.trim()) { alert('⚠️ La signature du client est obligatoire.'); return }
      if (hasJetActivity && !allJetsAssigned) { alert('⚠️ Assignez un jet ski à chaque activité jet ski.'); return }
      alert('⚠️ Remplissez tous les champs obligatoires.'); return
    }
    setSaving(true)
    try {
      // Reconstruit le cart avec jets + horaires
      const updatedCart: CartItem[] = cart.map(item => {
        const sched = schedules[item.cartId] || { start: '', end: '' }
        const assignedJet = item.activity.requiresJetSki
          ? (jetAssignments[item.cartId] || undefined)
          : item.assignedJetSkiId

        const startISO = sched.start
          ? new Date(`${baseDate}T${sched.start}:00`).toISOString()
          : item.itemStartTime || null
        const endISO = sched.end
          ? new Date(`${baseDate}T${sched.end}:00`).toISOString()
          : item.itemEndTime || null

        return {
          ...item,
          assignedJetSkiId: assignedJet,
          itemStatus: 'active' as const,
          itemStartTime: startISO,
          itemEndTime: endISO,
        }
      })

      // Horaires globaux de la location = min(starts) → max(ends)
      const activeTimes = updatedCart.filter(i => i.itemStartTime && i.itemEndTime)
      const overallStart = activeTimes.length > 0
        ? activeTimes.reduce((min, i) => i.itemStartTime! < min ? i.itemStartTime! : min, activeTimes[0].itemStartTime!)
        : rental.start_time
      const overallEnd = activeTimes.length > 0
        ? activeTimes.reduce((max, i) => i.itemEndTime! > max ? i.itemEndTime! : max, activeTimes[0].itemEndTime!)
        : rental.end_time

      // Jets combinés
      const allJetIds = jetSkiItems
        .map(i => jetAssignments[i.cartId])
        .filter(Boolean)
      const resolvedJetId = allJetIds.length > 0 ? allJetIds.join(',') : null

      const activityNames = cart.map(i => i.activity.name + (i.subtype ? ` — ${i.subtype}` : '')).join(', ')

      const { error } = await supabase
        .from('rentals')
        .update({
          client_name:      clientName.toUpperCase().trim(),
          client_firstname: clientFirstname.trim(),
          client_phone:     clientPhone.trim(),
          client_id_number: clientIdNumber.toUpperCase().trim(),
          activity_name:    activityNames,
          activity_id:      cart[0]?.activity.id || rental.activity_id,
          duration:         cart.map(i => i.activity.duration).join(' + '),
          price:            totalPrice,
          jet_ski_id:       resolvedJetId,
          payment_method:   paymentMethod,
          signature,
          cart_items:       updatedCart,
          start_time:       overallStart,
          end_time:         overallEnd,
        })
        .eq('id', rental.id)

      if (error) throw error
      onSaved()
    } catch (err) {
      console.error(err)
      alert('❌ Erreur lors de la modification.')
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-xl my-4 shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="font-bold text-gray-800 text-lg">✏️ Modifier le contrat</h2>
            <p className="text-xs text-gray-500 mt-0.5">{rental.contract_number}</p>
          </div>
          <button onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">✕</button>
        </div>

        <div className="px-6 py-5 space-y-6">

          {/* ── 1. Client ───────────────────────────────── */}
          <section>
            <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <span className="bg-blue-100 text-blue-700 rounded-full w-5 h-5 inline-flex items-center justify-center text-xs font-bold">1</span>
              Informations client
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Nom *</label>
                <input value={clientName} onChange={e => setClientName(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm uppercase outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Prénom *</label>
                <input value={clientFirstname} onChange={e => setClientFirstname(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Téléphone</label>
                <input value={clientPhone} onChange={e => setClientPhone(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">N° Pièce d'identité</label>
                <input value={clientIdNumber} onChange={e => setClientIdNumber(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm uppercase outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
            </div>
          </section>

          {/* ── 2. Panier ───────────────────────────────── */}
          <section>
            <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <span className="bg-blue-100 text-blue-700 rounded-full w-5 h-5 inline-flex items-center justify-center text-xs font-bold">2</span>
              Activités
            </h3>
            {cart.length > 0 ? (
              <div className="space-y-2 mb-3">
                {cart.map(item => (
                  <div key={item.cartId}
                    className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{ICONS[item.activity.name] || '🌊'}</span>
                      <div>
                        <p className="text-sm font-semibold text-blue-800">
                          {item.activity.name}{item.subtype ? ` — ${item.subtype}` : ''}
                        </p>
                        <p className="text-xs text-blue-500">{item.activity.duration}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-blue-900">{item.itemPrice.toLocaleString()} {CONFIG.currency}</span>
                      <button onClick={() => handleRemoveItem(item.cartId)}
                        className="text-red-400 hover:text-red-600 w-7 h-7 rounded-full flex items-center justify-center text-lg">×</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-sm text-red-600 mb-3">
                ⚠️ Aucune activité — ajoutez-en au moins une
              </div>
            )}
            {cart.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-2.5 mb-3 flex justify-between">
                <span className="text-sm font-medium text-green-700">💰 Total</span>
                <span className="text-xl font-bold text-green-800">{totalPrice.toLocaleString()} {CONFIG.currency}</span>
              </div>
            )}
            <div className="border border-dashed border-gray-300 rounded-xl p-3 bg-gray-50">
              <p className="text-xs font-semibold text-gray-500 mb-2">+ Ajouter une activité</p>
              <div className="space-y-2">
                <select value={addActivityId} onChange={e => { setAddActivityId(e.target.value); setAddSubtype('') }}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400 bg-white">
                  <option value="">— Choisir —</option>
                  {Object.entries(grouped).map(([name, variants]) => (
                    <optgroup key={name} label={`${ICONS[name] || '🌊'} ${name}`}>
                      {variants.map(act => (
                        <option key={act.id} value={act.id}>{act.duration} · {act.price.toLocaleString()} {CONFIG.currency}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                {selectedNewActivity?.hasSubtype && (
                  <div className="grid grid-cols-2 gap-2">
                    {CONFIG.boueeSubtypes.map(s => (
                      <button key={s} onClick={() => setAddSubtype(s)}
                        className={`py-2 rounded-xl border-2 text-xs font-medium transition-all ${
                          addSubtype === s ? 'border-orange-500 bg-orange-50 text-orange-800' : 'border-gray-200 text-gray-600'
                        }`}>{s}</button>
                    ))}
                  </div>
                )}
                {selectedNewActivity && (
                  <div className="flex items-center justify-between bg-white border border-blue-200 rounded-xl px-3 py-2">
                    <span className="text-sm text-blue-700 font-medium">
                      {selectedNewActivity.name} · {selectedNewActivity.duration} · <strong>{selectedNewActivity.price.toLocaleString()} {CONFIG.currency}</strong>
                    </span>
                    <button onClick={handleAddActivity}
                      className="bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-blue-800">+ Ajouter</button>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* ── 3. Jets + Horaires par activité ────────── */}
          <section>
            <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <span className="bg-blue-100 text-blue-700 rounded-full w-5 h-5 inline-flex items-center justify-center text-xs font-bold">3</span>
              Jets skis &amp; Horaires
            </h3>

            <div className="space-y-4">
              {cart.map((item, idx) => {
                const sched = schedules[item.cartId] || { start: '', end: '' }
                const isJet = item.activity.requiresJetSki
                const jetType = item.activity.jetType as 'FX' | 'VX' | undefined
                const jetsForType = jetType ? CONFIG.jetSkis.filter(j => j.type === jetType) : CONFIG.jetSkis
                const assignedHere = jetAssignments[item.cartId] || ''

                return (
                  <div key={item.cartId} className="border border-gray-200 rounded-2xl p-4 bg-gray-50">
                    <p className="text-sm font-bold text-gray-700 mb-3">
                      {idx + 1}. {ICONS[item.activity.name] || '🌊'} {item.activity.name}
                      {item.subtype ? ` — ${item.subtype}` : ''}
                      <span className="text-gray-400 font-normal ml-2">· {item.activity.duration}</span>
                    </p>

                    {/* Sélecteur jet (si activité jet ski) */}
                    {isJet && (
                      <div className="mb-3">
                        <p className="text-xs font-semibold text-gray-500 mb-2">
                          🚤 Jet ski assigné
                          {!assignedHere && <span className="text-red-500 ml-1">* obligatoire</span>}
                        </p>
                        <div className="grid grid-cols-4 gap-1.5">
                          {jetsForType.map(jet => {
                            const isOccupied = !!rentalMap[jet.id]
                            const isSelected = assignedHere === jet.id
                            // Jet pris par un autre item de cette même location
                            const takenByOther = !isSelected && allAssigned.includes(jet.id)
                            return (
                              <button key={jet.id}
                                onClick={() => { if (!isOccupied && !takenByOther) assignJet(item.cartId, jet.id) }}
                                disabled={isOccupied || takenByOther}
                                className={`p-2.5 rounded-xl border-2 text-center text-xs font-bold transition-all ${
                                  isSelected
                                    ? 'border-blue-600 bg-blue-100 text-blue-800 ring-2 ring-blue-300'
                                    : isOccupied
                                    ? 'border-red-200 bg-red-50 text-red-400 opacity-60 cursor-not-allowed'
                                    : takenByOther
                                    ? 'border-orange-200 bg-orange-50 text-orange-400 opacity-60 cursor-not-allowed'
                                    : 'border-green-200 bg-white text-gray-700 hover:border-green-400 hover:bg-green-50'
                                }`}
                              >
                                <div className="text-base mb-0.5">🚤</div>
                                <div>{jet.name}</div>
                                <div className={`text-[10px] mt-0.5 ${
                                  isSelected ? 'text-blue-600' :
                                  isOccupied ? 'text-red-400' :
                                  takenByOther ? 'text-orange-400' : 'text-green-600'
                                }`}>
                                  {isSelected ? '✅' : isOccupied ? '❌' : takenByOther ? '🟠' : '🟢'}
                                </div>
                              </button>
                            )
                          })}
                        </div>
                        {assignedHere && (
                          <p className="text-xs text-blue-600 font-medium mt-1.5">
                            ✅ <strong>{assignedHere}</strong>
                            <button onClick={() => assignJet(item.cartId, assignedHere)}
                              className="ml-2 text-gray-400 hover:text-red-400 underline">Retirer</button>
                          </p>
                        )}
                      </div>
                    )}

                    {/* Horaires */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-gray-500 mb-1 block">🕐 Heure départ</label>
                        <input type="time" value={sched.start}
                          onChange={e => setSchedules(prev => ({
                            ...prev, [item.cartId]: { ...prev[item.cartId], start: e.target.value }
                          }))}
                          className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-400" />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-500 mb-1 flex items-center justify-between">
                          <span>🏁 Heure retour</span>
                          <button onClick={() => autoEnd(item.cartId, item)}
                            className="text-[10px] text-blue-500 hover:text-blue-700 font-medium underline">
                            ⚡ Auto
                          </button>
                        </label>
                        <input type="time" value={sched.end}
                          onChange={e => setSchedules(prev => ({
                            ...prev, [item.cartId]: { ...prev[item.cartId], end: e.target.value }
                          }))}
                          className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-400" />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          {/* ── 4. Paiement ─────────────────────────────── */}
          <section>
            <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <span className="bg-blue-100 text-blue-700 rounded-full w-5 h-5 inline-flex items-center justify-center text-xs font-bold">4</span>
              Mode de paiement *
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {CONFIG.paymentMethods.map(method => {
                const icons: Record<string, string> = { 'Espèces': '💵', 'Carte bancaire': '💳', 'Virement': '🏦' }
                return (
                  <button key={method} onClick={() => setPaymentMethod(method)}
                    className={`py-3 rounded-xl border-2 text-xs font-semibold transition-all ${
                      paymentMethod === method
                        ? 'border-blue-500 bg-blue-50 text-blue-800'
                        : 'border-gray-200 text-gray-600 hover:border-blue-300'
                    }`}>
                    {icons[method] || '💰'} {method}
                  </button>
                )
              })}
              {/* Option En attente de paiement */}
              <button onClick={() => setPaymentMethod('En attente de paiement')}
                className={`py-3 rounded-xl border-2 text-xs font-semibold transition-all col-span-3 ${
                  paymentMethod === 'En attente de paiement'
                    ? 'border-orange-400 bg-orange-50 text-orange-800'
                    : 'border-orange-200 text-orange-600 hover:border-orange-300'
                }`}>
                ⏳ En attente de paiement
              </button>
            </div>
          </section>

          {/* ── 5. Signature ─────────────────────────────── */}
          <section>
            <h3 className="text-sm font-bold text-gray-700 mb-1 flex items-center gap-2">
              <span className="bg-orange-100 text-orange-700 rounded-full w-5 h-5 inline-flex items-center justify-center text-xs font-bold">5</span>
              Nouvelle signature du client
              <span className="text-red-500 text-xs">* obligatoire</span>
            </h3>
            <p className="text-xs text-gray-400 mb-2">Le client doit re-signer pour valider les modifications</p>
            <SignaturePad onSign={setSignature} />
          </section>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-3 rounded-2xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200">
            ✕ Annuler
          </button>
          <button onClick={handleSave} disabled={!canSave || saving}
            className="flex-1 py-3 rounded-2xl bg-blue-700 text-white font-bold disabled:opacity-40 hover:bg-blue-800">
            {saving ? '⏳ Enregistrement...' : '✅ Enregistrer'}
          </button>
        </div>
        {!signature && (
          <p className="text-center text-xs text-red-400 pb-3">⚠️ Signature obligatoire pour enregistrer</p>
        )}
      </div>
    </div>
  )
}
