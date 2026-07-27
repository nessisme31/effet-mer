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
    const canvas = canvasRef.current!
    const ctx    = canvas.getContext('2d')!
    const pos    = getPos(e, canvas)
    ctx.beginPath(); ctx.moveTo(pos.x, pos.y)
    drawing.current = true
  }

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing.current) return
    e.preventDefault()
    const canvas = canvasRef.current!
    const ctx    = canvas.getContext('2d')!
    const pos    = getPos(e, canvas)
    ctx.lineTo(pos.x, pos.y)
    ctx.strokeStyle = '#1d4ed8'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.stroke()
  }

  const stop = () => {
    drawing.current = false
    const sig = canvasRef.current!.toDataURL('image/png')
    setSigned(true); onSign(sig)
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
          onTouchStart={start} onTouchMove={draw} onTouchEnd={stop}
        />
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

  // Panier — initialisé depuis cart_items ou depuis l'activité principale
  const initCart = (): CartItem[] => {
    if (rental.cart_items && rental.cart_items.length > 0) return rental.cart_items
    const activity = CONFIG.activities.find(a => a.id === rental.activity_id)
      || CONFIG.activities.find(a => a.name === rental.activity_name)
    if (activity) return [{
      cartId: newCartId(), activity,
      subtype: rental.activity_subtype || undefined,
      itemPrice: rental.price,
    }]
    return []
  }

  const [cart, setCart] = useState<CartItem[]>(initCart)

  // Jet ski
  const [jetSkiId,   setJetSkiId]   = useState(rental.jet_ski_id || '')
  const [rentalMap,  setRentalMap]  = useState<Record<string, string>>({}) // jetId → client name

  // Ajout d'une activité
  const [addActivityId, setAddActivityId] = useState('')
  const [addSubtype,    setAddSubtype]    = useState('')

  // Charger jets occupés (sauf la location actuelle)
  useEffect(() => {
    supabase
      .from('rentals')
      .select('jet_ski_id, client_firstname, client_name')
      .eq('status', 'active')
      .not('jet_ski_id', 'is', null)
      .neq('id', rental.id)
      .then(({ data }) => {
        const map: Record<string, string> = {}
        data?.forEach(r => { if (r.jet_ski_id) map[r.jet_ski_id] = `${r.client_firstname} ${r.client_name}` })
        setRentalMap(map)
      })
  }, [rental.id])

  const totalPrice = cart.reduce((sum, item) => sum + item.itemPrice, 0)
  const hasJetActivity = cart.some(item => item.activity.requiresJetSki)

  // Grouper activités pour le sélecteur
  const grouped = CONFIG.activities.reduce((acc, act) => {
    if (!acc[act.name]) acc[act.name] = []
    acc[act.name].push(act)
    return acc
  }, {} as Record<string, ActivityConfig[]>)

  const selectedNewActivity = CONFIG.activities.find(a => a.id === addActivityId)

  // Ajouter au panier
  const handleAddActivity = () => {
    if (!selectedNewActivity) return
    if (selectedNewActivity.hasSubtype && !addSubtype) {
      alert('Veuillez choisir un type de bouée')
      return
    }
    setCart(prev => [...prev, {
      cartId: newCartId(),
      activity: selectedNewActivity,
      subtype: addSubtype || undefined,
      itemPrice: selectedNewActivity.price,
    }])
    setAddActivityId('')
    setAddSubtype('')
  }

  // Supprimer du panier
  const handleRemoveItem = (cartId: string) => {
    setCart(prev => prev.filter(i => i.cartId !== cartId))
  }

  const canSave = clientName.trim() && clientFirstname.trim() && cart.length > 0
    && paymentMethod && signature.trim()
    && (!hasJetActivity || jetSkiId)

  const handleSave = async () => {
    if (!canSave) {
      if (!signature.trim()) {
        alert('⚠️ La signature du client est obligatoire pour valider les modifications.')
      } else if (hasJetActivity && !jetSkiId) {
        alert('⚠️ Veuillez sélectionner un jet ski.')
      } else {
        alert('⚠️ Veuillez remplir tous les champs obligatoires.')
      }
      return
    }
    setSaving(true)
    try {
      const activityNames = cart.map(i =>
        i.activity.name + (i.subtype ? ` — ${i.subtype}` : '')
      ).join(', ')
      const durationStr = cart.map(i => i.activity.duration).join(' + ')
      const resolvedJet = hasJetActivity ? (jetSkiId || null) : null

      const updatedCart = cart.map(item => ({
        ...item,
        assignedJetSkiId: item.activity.requiresJetSki ? (resolvedJet ?? undefined) : item.assignedJetSkiId,
      }))

      const { error } = await supabase
        .from('rentals')
        .update({
          client_name:      clientName.toUpperCase().trim(),
          client_firstname: clientFirstname.trim(),
          client_phone:     clientPhone.trim(),
          client_id_number: clientIdNumber.toUpperCase().trim(),
          activity_name:    activityNames,
          activity_id:      cart[0]?.activity.id || rental.activity_id,
          duration:         durationStr,
          price:            totalPrice,
          jet_ski_id:       resolvedJet,
          payment_method:   paymentMethod,
          signature,
          cart_items:       updatedCart,
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

          {/* ── 2. Panier d'activités ────────────────────── */}
          <section>
            <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <span className="bg-blue-100 text-blue-700 rounded-full w-5 h-5 inline-flex items-center justify-center text-xs font-bold">2</span>
              Activités
            </h3>

            {/* Articles actuels */}
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
                        className="text-red-400 hover:text-red-600 hover:bg-red-50 w-7 h-7 rounded-full flex items-center justify-center transition-colors text-lg">
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-sm text-red-600 mb-3">
                ⚠️ Aucune activité — ajoutez-en au moins une
              </div>
            )}

            {/* Prix total */}
            {cart.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-2.5 mb-3 flex justify-between items-center">
                <span className="text-sm font-medium text-green-700">💰 Total</span>
                <span className="text-xl font-bold text-green-800">{totalPrice.toLocaleString()} {CONFIG.currency}</span>
              </div>
            )}

            {/* Ajouter une activité */}
            <div className="border border-dashed border-gray-300 rounded-xl p-3 bg-gray-50">
              <p className="text-xs font-semibold text-gray-500 mb-2">+ Ajouter une activité</p>
              <div className="space-y-2">
                <select
                  value={addActivityId}
                  onChange={e => { setAddActivityId(e.target.value); setAddSubtype('') }}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                >
                  <option value="">— Choisir une activité —</option>
                  {Object.entries(grouped).map(([name, variants]) => (
                    <optgroup key={name} label={`${ICONS[name] || '🌊'} ${name}`}>
                      {variants.map(act => (
                        <option key={act.id} value={act.id}>
                          {act.duration} · {act.price.toLocaleString()} {CONFIG.currency}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>

                {/* Subtype bouée */}
                {selectedNewActivity?.hasSubtype && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-1">Type de bouée :</p>
                    <div className="grid grid-cols-2 gap-2">
                      {CONFIG.boueeSubtypes.map(s => (
                        <button key={s} onClick={() => setAddSubtype(s)}
                          className={`py-2 rounded-xl border-2 text-xs font-medium transition-all ${
                            addSubtype === s
                              ? 'border-orange-500 bg-orange-50 text-orange-800'
                              : 'border-gray-200 hover:border-orange-300 text-gray-600'
                          }`}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {selectedNewActivity && (
                  <div className="flex items-center justify-between bg-white border border-blue-200 rounded-xl px-3 py-2">
                    <span className="text-sm text-blue-700 font-medium">
                      {selectedNewActivity.name} · {selectedNewActivity.duration} · <strong>{selectedNewActivity.price.toLocaleString()} {CONFIG.currency}</strong>
                    </span>
                    <button onClick={handleAddActivity}
                      className="bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-blue-800 transition-colors">
                      + Ajouter
                    </button>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* ── 3. Jet Ski ──────────────────────────────── */}
          {hasJetActivity && (
            <section>
              <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                <span className="bg-blue-100 text-blue-700 rounded-full w-5 h-5 inline-flex items-center justify-center text-xs font-bold">3</span>
                Jet Ski assigné
                {!jetSkiId && <span className="text-red-500 text-xs">* obligatoire</span>}
              </h3>
              <div className="grid grid-cols-4 gap-2">
                {CONFIG.jetSkis.map(jet => {
                  const isOccupied = !!rentalMap[jet.id]
                  const isSelected = jetSkiId === jet.id
                  return (
                    <button key={jet.id}
                      onClick={() => setJetSkiId(jet.id)}
                      className={`p-3 rounded-xl border-2 text-center text-sm font-bold transition-all ${
                        isSelected
                          ? 'border-blue-600 bg-blue-100 text-blue-800 ring-2 ring-blue-300'
                          : isOccupied
                          ? 'border-red-200 bg-red-50 text-red-500'
                          : 'border-green-200 bg-white text-gray-700 hover:border-green-400 hover:bg-green-50'
                      }`}
                    >
                      <div className="text-xl mb-1">🚤</div>
                      <div>{jet.name}</div>
                      <div className={`text-xs mt-0.5 ${isSelected ? 'text-blue-600' : isOccupied ? 'text-red-400' : 'text-green-600'}`}>
                        {isSelected ? '✅ Choisi' : isOccupied ? '❌ Sorti' : '🟢 Dispo'}
                      </div>
                      {isOccupied && rentalMap[jet.id] && (
                        <div className="text-red-300 text-xs mt-0.5 leading-tight truncate">{rentalMap[jet.id]}</div>
                      )}
                    </button>
                  )
                })}
              </div>
              {jetSkiId && (
                <div className="mt-2 text-xs text-center text-blue-600 font-medium">
                  Jet sélectionné : <strong>{jetSkiId}</strong>
                  <button onClick={() => setJetSkiId('')} className="ml-2 text-gray-400 hover:text-red-400 underline">
                    Déselectionner
                  </button>
                </div>
              )}
            </section>
          )}

          {/* ── 4. Paiement ─────────────────────────────── */}
          <section>
            <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <span className="bg-blue-100 text-blue-700 rounded-full w-5 h-5 inline-flex items-center justify-center text-xs font-bold">
                {hasJetActivity ? '4' : '3'}
              </span>
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
            </div>
          </section>

          {/* ── 5. Signature ─────────────────────────────── */}
          <section>
            <h3 className="text-sm font-bold text-gray-700 mb-1 flex items-center gap-2">
              <span className="bg-orange-100 text-orange-700 rounded-full w-5 h-5 inline-flex items-center justify-center text-xs font-bold">
                {hasJetActivity ? '5' : '4'}
              </span>
              Nouvelle signature du client
              <span className="text-red-500 text-xs">* obligatoire</span>
            </h3>
            <p className="text-xs text-gray-400 mb-2">
              Le client doit re-signer pour valider les modifications
            </p>
            <SignaturePad onSign={setSignature} />
          </section>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-3 rounded-2xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition-colors">
            ✕ Annuler
          </button>
          <button onClick={handleSave}
            disabled={!canSave || saving}
            className="flex-1 py-3 rounded-2xl bg-blue-700 text-white font-bold disabled:opacity-40 hover:bg-blue-800 transition-colors">
            {saving ? '⏳ Enregistrement...' : '✅ Enregistrer les modifications'}
          </button>
        </div>

        {!signature && (
          <p className="text-center text-xs text-red-400 pb-3">
            ⚠️ La signature du client est obligatoire pour enregistrer
          </p>
        )}
      </div>
    </div>
  )
}
