import { useState } from 'react'
import { CONFIG, ActivityConfig } from '../../config'
import { CartItem } from '../../types'

interface Props {
  initialCart?: CartItem[]
  onNext: (cart: CartItem[]) => void
}

const ICONS: Record<string, string> = {
  'Jet Ski VX': '🚤',
  'Jet Ski FX': '🚤',
  'Bouée Tractée': '🔵',
  'Ski Nautique': '🎿',
  'Wakeboard': '🏄',
  'Paddle': '🛶',
  'Kayak': '🚣',
  'Scooter sous-marin': '🤿',
}

export default function Step1Activity({ initialCart = [], onNext }: Props) {
  const [cart, setCart] = useState<CartItem[]>(initialCart)
  // Pour la bouée uniquement (nécessite choix du type + personnes)
  const [pendingBouee, setPendingBouee] = useState<ActivityConfig | null>(null)
  const [pendingSubtype, setPendingSubtype] = useState('')
  const [pendingPersons, setPendingPersons] = useState(1)
  // Feedback visuel quand on ajoute au panier
  const [lastAdded, setLastAdded] = useState<string | null>(null)

  const grouped = CONFIG.activities.reduce((acc, act) => {
    if (!acc[act.name]) acc[act.name] = []
    acc[act.name].push(act)
    return acc
  }, {} as Record<string, ActivityConfig[]>)

  const cartTotal = cart.reduce((sum, item) => sum + item.itemPrice, 0)

  // Ajouter directement au panier (pour activités sans sous-type)
  const addDirectToCart = (activity: ActivityConfig) => {
    const newItem: CartItem = {
      cartId: Math.random().toString(36).substr(2, 9),
      activity,
      itemPrice: activity.price,
    }
    setCart(prev => [...prev, newItem])
    // Feedback visuel 1.5 secondes
    setLastAdded(activity.id)
    setTimeout(() => setLastAdded(null), 1500)
  }

  // Ajouter la bouée au panier après sélection du type et des personnes
  const addBoueeToCart = () => {
    if (!pendingBouee || !pendingSubtype) return
    const itemPrice = pendingBouee.price * pendingPersons
    const newItem: CartItem = {
      cartId: Math.random().toString(36).substr(2, 9),
      activity: pendingBouee,
      subtype: pendingSubtype,
      numberOfPersons: pendingPersons,
      itemPrice,
    }
    setCart(prev => [...prev, newItem])
    setPendingBouee(null)
    setPendingSubtype('')
    setPendingPersons(1)
  }

  const removeFromCart = (cartId: string) => {
    setCart(prev => prev.filter(item => item.cartId !== cartId))
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-1">Étape 1 — Panier d'activités</h2>
      <p className="text-gray-500 text-sm mb-5">Cliquez sur une activité pour l'ajouter au panier</p>

      {/* Activity list */}
      <div className="space-y-3">
        {Object.entries(grouped).map(([name, variants]) => (
          <div key={name} className="border border-gray-200 rounded-2xl overflow-hidden">
            <div className="bg-gray-50 px-4 py-2.5 flex items-center gap-2 border-b border-gray-200">
              <span className="text-xl">{ICONS[name] || '🌊'}</span>
              <span className="font-semibold text-gray-700">{name}</span>
            </div>
            <div className="p-3 grid grid-cols-2 gap-2">
              {variants.map(activity => {
                const justAdded = lastAdded === activity.id
                return (
                  <button
                    key={activity.id}
                    onClick={() => {
                      if (activity.hasSubtype) {
                        // Bouée → ouvrir le panel de sélection
                        setPendingBouee(activity)
                        setPendingSubtype('')
                        setPendingPersons(1)
                      } else {
                        // Toutes les autres → ajout direct dans le panier
                        addDirectToCart(activity)
                      }
                    }}
                    className={`p-3 rounded-xl border-2 text-left transition-all relative ${
                      justAdded
                        ? 'border-green-500 bg-green-50 scale-95'
                        : pendingBouee?.id === activity.id
                        ? 'border-orange-400 bg-orange-50'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/30 active:scale-95'
                    }`}
                  >
                    {justAdded && (
                      <div className="absolute inset-0 flex items-center justify-center bg-green-50 rounded-xl">
                        <span className="text-green-600 font-bold text-sm">✅ Ajouté !</span>
                      </div>
                    )}
                    <div className="font-medium text-gray-700 text-sm">{activity.duration}</div>
                    <div className="text-blue-700 font-bold mt-0.5">
                      {activity.price.toLocaleString()} {CONFIG.currency}
                      {activity.hasSubtype && (
                        <span className="text-xs font-normal text-gray-500"> /pers.</span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Panel bouée (uniquement pour Bouée Tractée) */}
      {pendingBouee && (
        <div className="mt-4 p-4 bg-orange-50 rounded-2xl border-2 border-orange-300">
          <p className="font-semibold text-orange-800 mb-3">
            🔵 {pendingBouee.name} — {pendingBouee.duration}
          </p>

          {/* Sous-type */}
          <p className="text-sm font-medium text-orange-700 mb-2">Type de bouée :</p>
          <div className="grid grid-cols-2 gap-2 mb-3">
            {CONFIG.boueeSubtypes.map(subtype => (
              <button
                key={subtype}
                onClick={() => setPendingSubtype(subtype)}
                className={`py-2.5 px-3 rounded-xl border-2 font-medium text-sm transition-all ${
                  pendingSubtype === subtype
                    ? 'border-orange-500 bg-orange-100 text-orange-800'
                    : 'border-gray-200 bg-white hover:border-orange-300 text-gray-700'
                }`}
              >
                {subtype}
              </button>
            ))}
          </div>

          {/* Nombre de personnes */}
          {pendingSubtype && (
            <div className="mb-3">
              <p className="text-sm font-medium text-orange-700 mb-2">👥 Nombre de personnes :</p>
              <div className="grid grid-cols-6 gap-1.5">
                {[1, 2, 3, 4, 5, 6].map(n => (
                  <button
                    key={n}
                    onClick={() => setPendingPersons(n)}
                    className={`py-2.5 rounded-xl border-2 font-bold text-base transition-all ${
                      pendingPersons === n
                        ? 'border-orange-500 bg-orange-500 text-white shadow-md'
                        : 'border-orange-200 bg-white text-orange-700 hover:border-orange-400'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <p className="text-orange-600 text-sm mt-2 text-center font-medium">
                {pendingBouee.price.toLocaleString()} × {pendingPersons} pers. ={' '}
                <strong>{(pendingBouee.price * pendingPersons).toLocaleString()} {CONFIG.currency}</strong>
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => setPendingBouee(null)}
              className="flex-1 bg-white border border-gray-300 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              onClick={addBoueeToCart}
              disabled={!pendingSubtype}
              className="flex-1 bg-orange-500 text-white py-2.5 rounded-xl text-sm font-bold disabled:opacity-40 hover:bg-orange-600 transition-colors"
            >
              ➕ Ajouter au panier
            </button>
          </div>
        </div>
      )}

      {/* Panier */}
      {cart.length > 0 && (
        <div className="mt-4 p-4 bg-green-50 rounded-2xl border border-green-200">
          <p className="font-semibold text-green-800 mb-3">
            🛒 Panier ({cart.length} article{cart.length > 1 ? 's' : ''})
          </p>
          <div className="space-y-2 mb-3">
            {cart.map(item => (
              <div
                key={item.cartId}
                className="flex items-center justify-between bg-white rounded-xl px-3 py-2.5 border border-green-200"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 text-sm truncate">
                    {item.activity.name}
                    {item.subtype && ` — ${item.subtype}`}
                    {item.numberOfPersons && item.numberOfPersons > 1 && ` (${item.numberOfPersons} pers.)`}
                  </p>
                  <p className="text-gray-400 text-xs">{item.activity.duration}</p>
                </div>
                <div className="flex items-center gap-2 ml-2">
                  <span className="font-bold text-blue-700 text-sm whitespace-nowrap">
                    {item.itemPrice.toLocaleString()} {CONFIG.currency}
                  </span>
                  <button
                    onClick={() => removeFromCart(item.cartId)}
                    className="text-red-400 hover:text-red-600 text-lg w-6 h-6 flex items-center justify-center rounded-full hover:bg-red-50"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-green-300">
            <span className="font-bold text-green-800">Total</span>
            <span className="font-bold text-blue-700 text-xl">
              {cartTotal.toLocaleString()} {CONFIG.currency}
            </span>
          </div>
        </div>
      )}

      <button
        onClick={() => cart.length > 0 && onNext(cart)}
        disabled={cart.length === 0}
        className="mt-6 w-full bg-blue-700 text-white py-3.5 rounded-2xl font-semibold disabled:opacity-40 hover:bg-blue-800 transition-colors text-lg"
      >
        {cart.length === 0
          ? 'Sélectionnez une activité'
          : `Continuer → (${cart.length} activité${cart.length > 1 ? 's' : ''})`}
      </button>
    </div>
  )
}
