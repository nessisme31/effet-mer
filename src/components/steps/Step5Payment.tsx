import { useState } from 'react'
import { CONFIG } from '../../config'
import { CartItem } from '../../types'

interface Props {
  cart: CartItem[]
  totalPrice: number
  discount: number
  onNext: (paymentMethod: string) => void
  onBack: () => void
}

const PAYMENT_ICONS: Record<string, string> = {
  'Espèces': '💵',
  'Carte bancaire': '💳',
  'Virement': '🏦',
}

const PENDING_PAYMENT = 'En attente de paiement'

export default function Step5Payment({ cart, totalPrice, discount, onNext, onBack }: Props) {
  const [paymentMethod, setPaymentMethod] = useState('')

  const ht = Math.round(totalPrice / 1.2)
  const tva = totalPrice - ht

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-6">Étape 5 — Paiement</h2>

      {/* Récap montant */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 mb-6">
        <p className="text-gray-500 text-sm mb-1 text-center">Montant à encaisser</p>
        <p className="text-4xl font-bold text-blue-700 text-center">
          {totalPrice.toLocaleString()} <span className="text-2xl">{CONFIG.currency}</span>
        </p>

        <div className="mt-3 pt-3 border-t border-blue-200 space-y-1">
          <div className="flex justify-between text-xs text-gray-500">
            <span>Montant HT</span>
            <span>{ht.toLocaleString()} {CONFIG.currency}</span>
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>TVA 20%</span>
            <span>{tva.toLocaleString()} {CONFIG.currency}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-xs text-green-600">
              <span>🎁 Réduction appliquée</span>
              <span>−{discount.toLocaleString()} {CONFIG.currency}</span>
            </div>
          )}
        </div>

        <div className="mt-3 pt-3 border-t border-blue-200">
          {cart.map(item => (
            <div key={item.cartId} className="flex justify-between text-xs text-gray-500">
              <span>
                {item.activity.name}
                {item.subtype && ` — ${item.subtype}`}
                {item.numberOfPersons && item.numberOfPersons > 1 && ` ×${item.numberOfPersons}`}
                {' · '}{item.activity.duration}
              </span>
              <span>{item.itemPrice.toLocaleString()} {CONFIG.currency}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Modes de paiement standards */}
      <p className="font-semibold text-gray-700 mb-3">Mode de paiement :</p>
      <div className="space-y-3">
        {CONFIG.paymentMethods.map(method => (
          <button
            key={method}
            onClick={() => setPaymentMethod(method)}
            className={`w-full p-4 rounded-2xl border-2 text-left flex items-center gap-4 transition-all ${
              paymentMethod === method
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 bg-white hover:border-blue-300'
            }`}
          >
            <span className="text-3xl">{PAYMENT_ICONS[method]}</span>
            <span className="font-semibold text-gray-800 text-lg">{method}</span>
            {paymentMethod === method && (
              <span className="ml-auto text-blue-500 text-xl">✓</span>
            )}
          </button>
        ))}

        {/* Option spéciale : En attente de paiement */}
        <button
          onClick={() => setPaymentMethod(PENDING_PAYMENT)}
          className={`w-full p-4 rounded-2xl border-2 text-left flex items-center gap-4 transition-all ${
            paymentMethod === PENDING_PAYMENT
              ? 'border-orange-400 bg-orange-50'
              : 'border-orange-200 bg-white hover:border-orange-300'
          }`}
        >
          <span className="text-3xl">⏳</span>
          <div className="flex-1">
            <p className="font-semibold text-orange-800 text-lg">{PENDING_PAYMENT}</p>
            <p className="text-orange-500 text-xs mt-0.5">La location démarre normalement — apparaîtra en orange</p>
          </div>
          {paymentMethod === PENDING_PAYMENT && (
            <span className="ml-auto text-orange-500 text-xl">✓</span>
          )}
        </button>
      </div>

      <div className="flex gap-3 mt-6">
        <button
          onClick={onBack}
          className="flex-1 bg-gray-100 text-gray-700 py-3.5 rounded-2xl font-semibold hover:bg-gray-200 transition-colors"
        >
          ← Retour
        </button>
        <button
          onClick={() => paymentMethod && onNext(paymentMethod)}
          disabled={!paymentMethod}
          className="flex-1 bg-green-600 text-white py-3.5 rounded-2xl font-semibold disabled:opacity-40 hover:bg-green-700 transition-colors"
        >
          ✅ Valider
        </button>
      </div>
    </div>
  )
}
