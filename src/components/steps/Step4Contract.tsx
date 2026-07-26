import { useRef, useState } from 'react'
import { CONFIG, CONTRACT_TEXTS, ActivityConfig } from '../../config'
import { ContractLanguage, CartItem } from '../../types'

interface FormData {
  cart: CartItem[]
  totalPrice: number
  discount: number
  clientName: string
  clientFirstname: string
  clientPhone: string
  clientIdNumber: string
  jetSkiId?: string
  contractNumber: string
}

interface Props {
  formData: FormData
  onNext: (signature: string, language: ContractLanguage) => void
  onBack: () => void
}

const LANGUAGES: ContractLanguage[] = ['fr', 'en', 'ar']

export default function Step4Contract({ formData, onNext, onBack }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [isSigned, setIsSigned] = useState(false)
  const [signature, setSignature] = useState('')
  const [language, setLanguage] = useState<ContractLanguage>('fr')
  const lastPos = useRef({ x: 0, y: 0 })
  const hasDrawn = useRef(false)

  const text = CONTRACT_TEXTS[language]

  // Calculs fiscaux
  const totalTTC = formData.totalPrice
  const ht = Math.round(totalTTC / 1.2)
  const tva = totalTTC - ht
  const originalTotal = formData.cart.reduce((sum, item) => sum + item.itemPrice, 0)
  const hasDiscount = formData.discount > 0

  // Résumé des activités
  const cartSummary = formData.cart
    .map(item => {
      let s = item.activity.name
      if (item.subtype) s += ` — ${item.subtype}`
      if (item.numberOfPersons && item.numberOfPersons > 1) s += ` (${item.numberOfPersons} pers.)`
      return s
    })
    .join(' + ')

  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      }
    }
    return {
      x: ((e as React.MouseEvent).clientX - rect.left) * scaleX,
      y: ((e as React.MouseEvent).clientY - rect.top) * scaleY,
    }
  }

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas || isSigned) return
    e.preventDefault()
    setIsDrawing(true)
    hasDrawn.current = true
    lastPos.current = getPos(e, canvas)
  }

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    e.preventDefault()
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const pos = getPos(e, canvas)
    ctx.beginPath()
    ctx.moveTo(lastPos.current.x, lastPos.current.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.strokeStyle = '#1e3a8a'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()
    lastPos.current = pos
  }

  const stopDrawing = () => setIsDrawing(false)

  const clearSignature = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
    hasDrawn.current = false
    setIsSigned(false)
    setSignature('')
  }

  const validateSignature = () => {
    if (!hasDrawn.current) return
    const canvas = canvasRef.current
    if (!canvas) return
    setSignature(canvas.toDataURL('image/png'))
    setIsSigned(true)
  }

  const handleLanguageChange = (lang: ContractLanguage) => {
    setLanguage(lang)
    clearSignature()
  }

  // Date ET heure d'édition du contrat
  const now = new Date()
  const today = now.toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
  const timeNow = now.toLocaleTimeString('fr-FR', {
    hour: '2-digit', minute: '2-digit',
  })
  const dateTimeString = `${today} à ${timeNow}`

  const clientFullName = `${formData.clientFirstname} ${formData.clientName}`
  const disclaimer = text.disclaimer.replace('{{name}}', clientFullName)

  // Durée principale (la plus longue des activités)
  const maxDuration = formData.cart.reduce((max, item) =>
    item.activity.durationMinutes > max ? item.activity.durationMinutes : max, 0)
  const mainDuration = formData.cart.find(item => item.activity.durationMinutes === maxDuration)?.activity.duration ?? ''

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-4">Étape 4 — Contrat &amp; Signature</h2>

      {/* Language Selector */}
      <div className="mb-4">
        <p className="text-sm font-semibold text-gray-600 mb-2">🌐 Langue du contrat :</p>
        <div className="flex gap-2">
          {LANGUAGES.map(lang => {
            const t = CONTRACT_TEXTS[lang]
            return (
              <button
                key={lang}
                onClick={() => handleLanguageChange(lang)}
                className={`flex-1 py-2.5 px-3 rounded-xl border-2 font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                  language === lang
                    ? 'border-blue-500 bg-blue-50 text-blue-800'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-blue-300'
                }`}
              >
                <span className="text-xl">{t.flag}</span>
                <span>{t.langLabel}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── CONTRACT DOCUMENT ── */}
      <div
        className="bg-white border-2 border-gray-200 rounded-2xl p-5 mb-5 text-xs max-h-[440px] overflow-y-auto"
        dir={text.dir}
      >
        {/* ── EN-TÊTE SOCIÉTÉ ── */}
        <div className="text-center pb-3 mb-3 border-b-2 border-gray-300">
          <p className="font-bold text-blue-800 text-sm">{CONFIG.businessName}</p>
          <p className="text-gray-600 font-medium text-xs">{CONFIG.company}</p>
          <p className="text-gray-500 text-xs">{CONFIG.address} — {CONFIG.city}</p>
          <p className="text-gray-500 text-xs">ICE : {CONFIG.ice} &nbsp;|&nbsp; RC : {CONFIG.rc}</p>
          <p className="text-gray-500 text-xs">{CONFIG.email}</p>
          <p className="text-gray-500 text-xs mt-0.5">{CONFIG.location}</p>
        </div>

        {/* ── TITRE DU CONTRAT ── */}
        <p className="text-center font-bold text-blue-700 text-xs mb-3 tracking-wide uppercase">
          {text.title}
        </p>

        {/* ── N° CONTRAT & DATE + HEURE ── */}
        <div className="grid grid-cols-2 gap-1 mb-3 bg-gray-50 rounded-xl p-2">
          <div>
            <span className="text-gray-400">{text.fields.contract} :</span>{' '}
            <strong>{formData.contractNumber}</strong>
          </div>
          <div>
            <span className="text-gray-400">{text.fields.date} :</span>{' '}
            <strong>{dateTimeString}</strong>
          </div>
          <div className="col-span-2">
            <span className="text-gray-400">{text.fields.location} :</span>{' '}
            <strong>{CONFIG.location}</strong>
          </div>
        </div>

        {/* ── INFOS CLIENT ── */}
        <div className="border border-gray-200 rounded-xl p-2.5 mb-3">
          <p className="font-bold text-gray-700 text-xs mb-1.5 uppercase tracking-wide">
            {text.lesseeLabel}
          </p>
          <div className="grid grid-cols-2 gap-1">
            <div>
              <span className="text-gray-400">{text.fields.fullName} :</span>{' '}
              <strong>{clientFullName}</strong>
            </div>
            <div>
              <span className="text-gray-400">{text.fields.phone} :</span>{' '}
              <strong>{formData.clientPhone}</strong>
            </div>
            <div className="col-span-2">
              <span className="text-gray-400">{text.fields.idCard} :</span>{' '}
              <strong>{formData.clientIdNumber}</strong>
            </div>
          </div>
        </div>

        {/* ── DÉTAILS PRESTATION ── */}
        <div className="border border-gray-200 rounded-xl p-2.5 mb-3">
          <p className="font-bold text-gray-700 text-xs mb-1.5 uppercase tracking-wide">
            {text.prestationLabel}
          </p>

          {/* Liste des activités */}
          <div className="space-y-1 mb-2">
            {formData.cart.map((item, idx) => (
              <div key={item.cartId} className="flex justify-between">
                <span>
                  <span className="text-gray-400">{idx + 1}.</span>{' '}
                  <strong>
                    {item.activity.name}
                    {item.subtype ? ` — ${item.subtype}` : ''}
                    {item.numberOfPersons && item.numberOfPersons > 1 ? ` (${item.numberOfPersons} pers.)` : ''}
                  </strong>
                  {' · '}<span className="text-gray-400">{item.activity.duration}</span>
                </span>
                <strong>{item.itemPrice.toLocaleString()} {CONFIG.currency}</strong>
              </div>
            ))}
          </div>

          {/* Décomposition fiscale */}
          <div className="border-t border-gray-100 pt-1.5 mt-1.5 space-y-0.5">
            {hasDiscount && (
              <div className="flex justify-between text-gray-400">
                <span>Sous-total avant réduction</span>
                <span>{originalTotal.toLocaleString()} {CONFIG.currency}</span>
              </div>
            )}
            {hasDiscount && (
              <div className="flex justify-between text-orange-500">
                <span>Réduction</span>
                <span>- {formData.discount.toLocaleString()} {CONFIG.currency}</span>
              </div>
            )}
            <div className="flex justify-between text-gray-500">
              <span>Montant HT</span>
              <span>{ht.toLocaleString()} {CONFIG.currency}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>TVA 20%</span>
              <span>{tva.toLocaleString()} {CONFIG.currency}</span>
            </div>
            <div className="flex justify-between font-bold text-blue-700 pt-1 border-t border-gray-200">
              <span>{text.fields.price} TTC</span>
              <span>{totalTTC.toLocaleString()} {CONFIG.currency}</span>
            </div>
          </div>
        </div>

        {/* ── CLAUSES DU CONTRAT ── */}
        <div className="space-y-2.5">
          {text.sections.map(section => (
            <div key={section.num} className="border border-gray-100 rounded-xl p-2.5">
              <p className="font-bold text-gray-800 mb-1">
                {section.num}. {section.title}
              </p>
              {section.intro && (
                <p className="text-gray-600 mb-1 leading-relaxed">{section.intro}</p>
              )}
              {section.bullets && (
                <ul className="space-y-0.5 text-gray-600">
                  {section.bullets.map((bullet, i) => (
                    <li key={i} className="flex gap-1.5">
                      <span className="text-blue-500 flex-shrink-0">•</span>
                      <span className="leading-relaxed">{bullet}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>

        {/* ── CLAUSE DE SIGNATURE ── */}
        <div className="border-t border-gray-200 pt-3 mt-3 text-gray-600 leading-relaxed">
          {disclaimer}
        </div>
      </div>

      {/* ── SIGNATURE PAD ── */}
      {!isSigned ? (
        <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-2xl p-4">
          <p className="text-sm font-semibold text-gray-700 mb-2 text-center">
            ✍️{' '}
            {language === 'fr' && 'Signature du client'}
            {language === 'en' && 'Customer signature'}
            {language === 'ar' && 'توقيع العميل'}
          </p>
          <canvas
            ref={canvasRef}
            width={600}
            height={150}
            className="border border-gray-300 rounded-xl w-full bg-white cursor-crosshair touch-none"
            style={{ touchAction: 'none' }}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
          <div className="flex justify-between mt-3">
            <button type="button" onClick={clearSignature}
              className="text-sm text-gray-400 hover:text-gray-600 underline">
              {language === 'ar' ? 'مسح' : language === 'en' ? 'Clear' : 'Effacer'}
            </button>
            <button type="button" onClick={validateSignature}
              className="bg-blue-700 text-white px-6 py-2 rounded-xl text-sm font-semibold hover:bg-blue-800 transition-colors">
              {language === 'ar' ? 'التحقق من التوقيع ✓' : language === 'en' ? 'Confirm signature ✓' : 'Valider la signature ✓'}
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-green-50 border-2 border-green-300 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-green-700 font-bold">
              ✅ Contrat signé · {CONTRACT_TEXTS[language].flag} {CONTRACT_TEXTS[language].langLabel}
            </p>
            <p className="text-green-600 text-sm">{clientFullName}</p>
          </div>
          <button onClick={clearSignature} className="text-sm text-gray-400 hover:text-gray-600 underline">
            Refaire
          </button>
        </div>
      )}

      <div className="flex gap-3 mt-5">
        <button onClick={onBack}
          className="flex-1 bg-gray-100 text-gray-700 py-3.5 rounded-2xl font-semibold hover:bg-gray-200 transition-colors">
          ← Retour
        </button>
        <button
          onClick={() => isSigned && onNext(signature, language)}
          disabled={!isSigned}
          className="flex-1 bg-blue-700 text-white py-3.5 rounded-2xl font-semibold disabled:opacity-40 hover:bg-blue-800 transition-colors">
          Suivant →
        </button>
      </div>
    </div>
  )
}
