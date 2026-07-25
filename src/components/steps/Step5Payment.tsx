import { useState } from 'react'
import { CONFIG, ActivityConfig } from '../../config'

interface Props {
  activity: ActivityConfig
  activitySubtype?: string
  numberOfPersons?: number
  totalPrice?: number
  onNext: (paymentMethod: string) => void
  onBack: () => void
}

const PAYMENT_ICONS: Record<string, string> = {
  'Espèces': '💵',
  'Carte bancaire': '💳',
  'Virement': '🏦',
}

export default function Step5Payment({ activity, activitySubtype, numberOfPersons, totalPrice, onNext, onBack }: Props) {
  const [paymentMethod, setPaymentMethod] = useState('')

  const displayPrice = totalPrice ?? activity.price

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-6">Étape 5 — Paiement</h2>

      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 mb-6 text-center">
        <p className="text-gray-500 text-sm mb-1">Montant à encaisser</p>
        <p className="text-4xl font-bold text-blue-700">
          {displayPrice.toLocaleString()} <span className="text-2xl">{CONFIG.currency}</span>
        </p>
        <p className="text-gray-500 text-sm mt-2">
          {activity.name}{activitySubtype ? ` — ${activitySubtype}` : ''} · {activity.duration}
        </p>
        {/* Détail du calcul pour bouée tractée */}
        {numberOfPersons && numberOfPersons > 1 && totalPrice && (
          <p className="text-blue-500 text-xs mt-1 font-medium">
            {activity.price.toLocaleString()} {CONFIG.currency} × {numberOfPersons} personnes
          </p>
        )}
      </div>

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
          className="flex-1 bg-blue-700 text-white py-3.5 rounded-2xl font-semibold disabled:opacity-40 hover:bg-blue-800 transition-colors"
        >
          Suivant →
        </button>
      </div>
    </div>
  )
}
