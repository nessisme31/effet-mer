import { useState } from 'react'
import { CONFIG } from '../../config'
import { CartItem } from '../../types'

interface Props {
  cart: CartItem[]
  onNext: (discount: number, finalTTC: number) => void
  onBack: () => void
}

export default function Step3Recap({ cart, onNext, onBack }: Props) {
  const [discountInput, setDiscountInput] = useState('')

  const totalTTC = cart.reduce((sum, item) => sum + item.itemPrice, 0)
  const ht = Math.round(totalTTC / 1.2)
  const tva = totalTTC - ht

  const discount = Number(discountInput) || 0
  const finalTTC = Math.max(0, totalTTC - discount)
  const finalHT = Math.round(finalTTC / 1.2)
  const finalTVA = finalTTC - finalHT

  const handleDiscountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Accepter uniquement des chiffres
    const value = e.target.value.replace(/[^0-9]/g, '')
    setDiscountInput(value)
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-6">Récapitulatif & Montant</h2>

      {/* Liste des activités */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-4">
        <p className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <span>🛒</span> Activités
        </p>
        <div className="space-y-2.5">
          {cart.map(item => (
            <div key={item.cartId} className="flex justify-between items-start">
              <div>
                <p className="text-gray-800 text-sm font-medium">
                  {item.activity.name}
                  {item.subtype && ` — ${item.subtype}`}
                  {item.numberOfPersons && item.numberOfPersons > 1 && (
                    <span className="text-blue-600"> × {item.numberOfPersons} pers.</span>
                  )}
                </p>
                <p className="text-gray-400 text-xs">{item.activity.duration}</p>
              </div>
              <span className="font-semibold text-gray-800 whitespace-nowrap ml-4">
                {item.itemPrice.toLocaleString()} {CONFIG.currency}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Décomposition fiscale */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-4">
        <p className="font-semibold text-blue-800 mb-3">🧾 Décomposition fiscale</p>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-gray-600 text-sm">Montant HT</span>
            <span className="font-semibold text-gray-800">{ht.toLocaleString()} {CONFIG.currency}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600 text-sm">TVA 20%</span>
            <span className="font-semibold text-gray-800">{tva.toLocaleString()} {CONFIG.currency}</span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-blue-200">
            <span className="font-bold text-blue-800 text-sm">Total TTC</span>
            <span className="font-bold text-blue-700 text-lg">{totalTTC.toLocaleString()} {CONFIG.currency}</span>
          </div>
        </div>
      </div>

      {/* Case réduction */}
      <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 mb-4">
        <p className="font-semibold text-orange-800 mb-2">🎁 Réduction (optionnel)</p>
        <div className="flex items-center gap-3">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={discountInput}
            onChange={handleDiscountChange}
            placeholder="0"
            className="flex-1 border-2 border-orange-300 rounded-xl px-4 py-3 text-2xl font-bold text-center focus:ring-2 focus:ring-orange-400 outline-none bg-white"
          />
          <span className="text-orange-700 font-bold text-xl">{CONFIG.currency}</span>
        </div>
        {discount > 0 && discount <= totalTTC && (
          <p className="text-orange-600 text-sm mt-2 text-center">
            Réduction de <strong>{discount.toLocaleString()} {CONFIG.currency}</strong> appliquée
          </p>
        )}
        {discount > totalTTC && (
          <p className="text-red-500 text-sm mt-2 text-center">
            ⚠️ La réduction ne peut pas dépasser le total
          </p>
        )}
      </div>

      {/* Montant final */}
      <div className={`rounded-2xl p-5 mb-6 ${discount > 0 && discount <= totalTTC ? 'bg-green-50 border-2 border-green-300' : 'bg-blue-50 border border-blue-200'}`}>
        <p className="text-gray-500 text-sm mb-1 text-center">Montant total à encaisser</p>
        <p className="text-4xl font-bold text-blue-700 text-center">
          {finalTTC.toLocaleString()} <span className="text-2xl">{CONFIG.currency}</span>
        </p>
        {discount > 0 && discount <= totalTTC && (
          <>
            <p className="text-gray-400 text-sm text-center mt-1">
              <span className="line-through">{totalTTC.toLocaleString()} {CONFIG.currency}</span>
              {' '}− {discount.toLocaleString()} {CONFIG.currency}
            </p>
            <div className="mt-3 pt-3 border-t border-green-200 space-y-1">
              <div className="flex justify-between text-xs text-gray-500">
                <span>HT après réduction</span>
                <span>{finalHT.toLocaleString()} {CONFIG.currency}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>TVA 20%</span>
                <span>{finalTVA.toLocaleString()} {CONFIG.currency}</span>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 bg-gray-100 text-gray-700 py-3.5 rounded-2xl font-semibold hover:bg-gray-200 transition-colors"
        >
          ← Retour
        </button>
        <button
          onClick={() => onNext(discount, finalTTC)}
          disabled={discount > totalTTC}
          className="flex-1 bg-blue-700 text-white py-3.5 rounded-2xl font-semibold hover:bg-blue-800 transition-colors disabled:opacity-40"
        >
          Valider & Signer →
        </button>
      </div>
    </div>
  )
}
