import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { CONFIG } from '../config'
import { Rental } from '../types'

interface Props {
  rental: Rental
  onClose: () => void
  onSaved: () => void
}

// ── Composant signature ────────────────────────────────────
function SignaturePad({ onSign }: { onSign: (sig: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing   = useRef(false)
  const [signed, setSigned]     = useState(false)
  const [preview, setPreview]   = useState('')

  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect()
    const src  = 'touches' in e ? e.touches[0] : e
    return { x: src.clientX - rect.left, y: src.clientY - rect.top }
  }

  const start = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!
    const ctx    = canvas.getContext('2d')!
    const pos    = getPos(e, canvas)
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
    drawing.current = true
  }

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing.current) return
    e.preventDefault()
    const canvas = canvasRef.current!
    const ctx    = canvas.getContext('2d')!
    const pos    = getPos(e, canvas)
    ctx.lineTo(pos.x, pos.y)
    ctx.strokeStyle = '#1d4ed8'
    ctx.lineWidth   = 2.5
    ctx.lineCap     = 'round'
    ctx.stroke()
  }

  const stop = () => {
    drawing.current = false
    const sig = canvasRef.current!.toDataURL('image/png')
    setPreview(sig)
    setSigned(true)
    onSign(sig)
  }

  const clear = () => {
    const canvas = canvasRef.current!
    canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height)
    setSigned(false)
    setPreview('')
    onSign('')
  }

  return (
    <div>
      <div className="border-2 border-blue-300 rounded-xl overflow-hidden bg-white">
        <canvas
          ref={canvasRef}
          width={500}
          height={140}
          className="w-full touch-none cursor-crosshair"
          style={{ maxHeight: 140 }}
          onMouseDown={start} onMouseMove={draw} onMouseUp={stop} onMouseLeave={stop}
          onTouchStart={start} onTouchMove={draw} onTouchEnd={stop}
        />
      </div>
      <div className="flex justify-between items-center mt-1.5">
        <span className={`text-xs font-medium ${signed ? 'text-green-600' : 'text-gray-400'}`}>
          {signed ? '✅ Signature enregistrée' : 'Signez dans le cadre ci-dessus'}
        </span>
        {signed && (
          <button onClick={clear} className="text-xs text-red-400 hover:text-red-600 underline">
            Effacer
          </button>
        )}
      </div>
    </div>
  )
}

export default function EditRentalModal({ rental, onClose, onSaved }: Props) {
  // ── État du formulaire pré-rempli ──────────────────────────
  const [clientName,      setClientName]      = useState(rental.client_name)
  const [clientFirstname, setClientFirstname] = useState(rental.client_firstname)
  const [clientPhone,     setClientPhone]     = useState(rental.client_phone)
  const [clientIdNumber,  setClientIdNumber]  = useState(rental.client_id_number)
  const [activityName,    setActivityName]    = useState(rental.activity_name)
  const [duration,        setDuration]        = useState(rental.duration)
  const [price,           setPrice]           = useState(String(rental.price))
  const [paymentMethod,   setPaymentMethod]   = useState(rental.payment_method)
  const [signature,       setSignature]       = useState('')
  const [saving,          setSaving]          = useState(false)

  const canSave = clientName.trim() && clientFirstname.trim() && signature.trim()

  const handleSave = async () => {
    if (!canSave) {
      alert('⚠️ Le client doit re-signer le contrat pour valider les modifications.')
      return
    }
    setSaving(true)
    try {
      const { error } = await supabase
        .from('rentals')
        .update({
          client_name:      clientName.toUpperCase().trim(),
          client_firstname: clientFirstname.trim(),
          client_phone:     clientPhone.trim(),
          client_id_number: clientIdNumber.toUpperCase().trim(),
          activity_name:    activityName.trim(),
          duration:         duration.trim(),
          price:            Number(price) || rental.price,
          payment_method:   paymentMethod,
          signature:        signature,
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
      <div className="bg-white rounded-2xl w-full max-w-lg my-4 shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="font-bold text-gray-800 text-lg">✏️ Modifier le contrat</h2>
            <p className="text-xs text-gray-500 mt-0.5">{rental.contract_number}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">

          {/* Infos client */}
          <div>
            <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <span className="bg-blue-100 text-blue-700 rounded-full w-5 h-5 inline-flex items-center justify-center text-xs font-bold">1</span>
              Informations client
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Nom</label>
                <input value={clientName} onChange={e => setClientName(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm uppercase outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Prénom</label>
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
          </div>

          {/* Prestation */}
          <div>
            <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <span className="bg-blue-100 text-blue-700 rounded-full w-5 h-5 inline-flex items-center justify-center text-xs font-bold">2</span>
              Prestation
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Activité</label>
                <input value={activityName} onChange={e => setActivityName(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Durée</label>
                <input value={duration} onChange={e => setDuration(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Prix ({CONFIG.currency})</label>
                <input type="number" value={price} onChange={e => setPrice(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
            </div>

            {/* Mode de paiement */}
            <div className="mt-3">
              <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Mode de paiement</label>
              <div className="grid grid-cols-3 gap-2">
                {CONFIG.paymentMethods.map(method => {
                  const icons: Record<string, string> = { 'Espèces': '💵', 'Carte bancaire': '💳', 'Virement': '🏦' }
                  return (
                    <button key={method} type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`py-2 rounded-xl border-2 text-xs font-semibold transition-all ${
                        paymentMethod === method
                          ? 'border-blue-500 bg-blue-50 text-blue-800'
                          : 'border-gray-200 text-gray-600 hover:border-blue-300'
                      }`}
                    >
                      {icons[method] || '💰'} {method}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Signature obligatoire */}
          <div>
            <h3 className="text-sm font-bold text-gray-700 mb-1 flex items-center gap-2">
              <span className="bg-orange-100 text-orange-700 rounded-full w-5 h-5 inline-flex items-center justify-center text-xs font-bold">3</span>
              Nouvelle signature du client
              <span className="text-red-500 text-xs">obligatoire</span>
            </h3>
            <p className="text-xs text-gray-400 mb-2">
              Le client doit re-signer pour valider les modifications
            </p>
            <SignaturePad onSign={setSignature} />
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-3 rounded-2xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition-colors">
            ✕ Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave || saving}
            className="flex-1 py-3 rounded-2xl bg-blue-700 text-white font-bold disabled:opacity-40 hover:bg-blue-800 transition-colors"
          >
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
