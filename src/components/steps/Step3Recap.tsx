import { useState } from 'react'
import { CONFIG } from '../../config'
import { CartItem } from '../../types'

// Génère un ID unique pour chaque item du panier
const uid = () => Math.random().toString(36).slice(2, 9)

interface Props {
  cart: CartItem[]
  onNext: (discount: number, finalTTC: number) => void
  onBack: () => void
  onUpdateCart: (newCart: CartItem[]) => void   // ← NOUVEAU : permet de modifier le panier
}

export default function Step3Recap({ cart, onNext, onBack, onUpdateCart }: Props) {
  const [discountInput, setDiscountInput] = useState('')
  const [showAddPanel, setShowAddPanel] = useState(false)

  // ── Supprimer une activité ─────────────────────────────────
  const handleRemoveItem = (cartId: string) => {
    const newCart = cart.filter(item => item.cartId !== cartId)
    onUpdateCart(newCart)
  }

  // ── Ajouter une activité depuis le menu ───────────────────
  const handleAddActivity = (activity: typeof CONFIG.activities[0], subtype?: string) => {
    const newItem: CartItem = {
      cartId: uid(),
      activity,
      subtype: subtype || undefined,
      itemPrice: activity.price,
    }
    onUpdateCart([...cart, newItem])
    setShowAddPanel(false)
  }

  // ── Calculs de prix ───────────────────────────────────────
  const totalTTC = cart.reduce((sum, item) => sum + item.itemPrice, 0)
  const ht        = Math.round(totalTTC / 1.2)
  const tva       = totalTTC - ht

  const discount  = Number(discountInput) || 0
  const finalTTC  = Math.max(0, totalTTC - discount)
  const finalHT   = Math.round(finalTTC / 1.2)
  const finalTVA  = finalTTC - finalHT

  const handleDiscountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDiscountInput(e.target.value.replace(/[^0-9]/g, ''))
  }

  const cartEmpty = cart.length === 0

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-6">Récapitulatif & Montant</h2>

      {/* ── Panier avec boutons ✕ ── */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-4">
        <p className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <span>🛒</span> Activités
          {cart.length > 0 && (
            <span className="ml-auto text-xs text-gray-400">{cart.length} article(s)</span>
          )}
        </p>

        {cartEmpty ? (
          <div className="text-center py-6 text-gray-400">
            <p className="text-4xl mb-2">🛒</p>
            <p className="text-sm">Panier vide — ajoutez une activité ci-dessous</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {cart.map(item => (
              <div key={item.cartId} className="flex justify-between items-center gap-2 group">
                <div className="flex-1">
                  <p className="text-gray-800 text-sm font-medium">
                    {item.activity.name}
                    {item.subtype && ` — ${item.subtype}`}
                    {item.numberOfPersons && item.numberOfPersons > 1 && (
                      <span className="text-blue-600"> × {item.numberOfPersons} pers.</span>
                    )}
                  </p>
                  <p className="text-gray-400 text-xs">{item.activity.duration}</p>
                </div>
                <span className="font-semibold text-gray-800 whitespace-nowrap">
                  {item.itemPrice.toLocaleString()} {CONFIG.currency}
                </span>
                {/* Bouton ✕ */}
                <button
                  onClick={() => handleRemoveItem(item.cartId)}
                  className="flex-shrink-0 w-7 h-7 rounded-full bg-red-50 hover:bg-red-100 text-red-400 hover:text-red-600 flex items-center justify-center text-sm transition-colors border border-red-200"
                  title="Supprimer"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── Bouton Ajouter une activité ── */}
        <button
          onClick={() => setShowAddPanel(!showAddPanel)}
          className={`mt-3 w-full py-2.5 rounded-xl border-2 border-dashed text-sm font-semibold transition-all ${
            showAddPanel
              ? 'border-blue-400 bg-blue-50 text-blue-700'
              : 'border-gray-300 text-gray-500 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50/30'
          }`}
        >
          {showAddPanel ? '✕ Fermer' : '➕ Ajouter une activité'}
        </button>

        {/* ── Panel d'ajout d'activité ── */}
        {showAddPanel && (
          <div className="mt-3 border border-blue-200 rounded-xl overflow-hidden">
            <div className="bg-blue-50 px-3 py-2 text-xs text-blue-700 font-semibold">
              Choisissez une activité à ajouter
            </div>
            <div className="max-h-64 overflow-y-auto">
              {CONFIG.activities.map(activity => {
                // Bouée → sous-types dans CONFIG.boueeSubtypes
                if (activity.hasSubtype && CONFIG.boueeSubtypes) {
                  return CONFIG.boueeSubtypes.map((sub: string) => (
                    <button
                      key={`${activity.id}-${sub}`}
                      onClick={() => handleAddActivity(activity, sub)}
                      className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-0 flex justify-between items-center"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-800">
                          {activity.name} — {sub}
                        </p>
                        <p className="text-xs text-gray-400">{activity.duration}</p>
                      </div>
                      <span className="text-sm font-bold text-blue-700 ml-4 flex-shrink-0">
                        {activity.price.toLocaleString()} {CONFIG.currency}
                      </span>
                    </button>
                  ))
                }
                // Activité simple
                return (
                  <button
                    key={activity.id}
                    onClick={() => handleAddActivity(activity)}
                    className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-0 flex justify-between items-center"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-800">{activity.name}</p>
                      <p className="text-xs text-gray-400">{activity.duration}</p>
                    </div>
                    <span className="text-sm font-bold text-blue-700 ml-4 flex-shrink-0">
                      {activity.price.toLocaleString()} {CONFIG.currency}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Décomposition fiscale ── */}
      {!cartEmpty && (
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
      )}

      {/* ── Réduction ── */}
      {!cartEmpty && (
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
      )}

      {/* ── Montant final ── */}
      {!cartEmpty && (
        <div className={`rounded-2xl p-5 mb-6 ${
          discount > 0 && discount <= totalTTC
            ? 'bg-green-50 border-2 border-green-300'
            : 'bg-blue-50 border border-blue-200'
        }`}>
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
      )}

      {/* ── Navigation ── */}
      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 bg-gray-100 text-gray-700 py-3.5 rounded-2xl font-semibold hover:bg-gray-200 transition-colors"
        >
          ← Retour
        </button>
        <button
          onClick={() => onNext(discount, finalTTC)}
          disabled={cartEmpty || discount > totalTTC}
          className="flex-1 bg-blue-700 text-white py-3.5 rounded-2xl font-semibold hover:bg-blue-800 transition-colors disabled:opacity-40"
        >
          Valider & Signer →
        </button>
      </div>
    </div>
  )
}
