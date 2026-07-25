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
  const [pendingActivity, setPendingActivity] = useState<ActivityConfig | null>(null)
  const [pendingSubtype, setPendingSubtype] = useState('')
  const [pendingPersons, setPendingPersons] = useState(1)

  const grouped = CONFIG.activities.reduce((acc, act) => {
    if (!acc[act.name]) acc[act.name] = []
    acc[act.name].push(act)
    return acc
  }, {} as Record<string, ActivityConfig[]>)

  const cartTotal = cart.reduce((sum, item) => sum + item.itemPrice, 0)

  const selectActivity = (activity: ActivityConfig) => {
    setPendingActivity(activity)
    setPendingSubtype('')
    setPendingPersons(1)
  }

  const addToCart = () => {
    if (!pendingActivity) return
    if (pendingActivity.hasSubtype && !pendingSubtype) return

    const itemPrice = pendingActivity.hasSubtype
      ? pendingActivity.price * pendingPersons
      : pendingActivity.price

    const newItem: CartItem = {
      cartId: Math.random().toString(36).substr(2, 9),
      activity: pendingActivity,
      subtype: pendingSubtype || undefined,
      numberOfPersons: pendingActivity.hasSubtype ? pendingPersons : undefined,
      itemPrice,
    }

    setCart(prev => [...prev, newItem])
    setPendingActivity(null)
    setPendingSubtype('')
    setPendingPersons(1)
  }

  const removeFromCart = (cartId: string) => {
    setCart(prev => prev.filter(item => item.cartId !== cartId))
  }

  const canAddPending = pendingActivity && (!pendingActivity.hasSubtype || pendingSubtype)

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-1">Étape 1 — Panier d'activités</h2>
      <p className="text-gray-500 text-sm mb-5">Sélectionnez une ou plusieurs activités</p>

      {/* Activity list */}
      <div className="space-y-3">
        {Object.entries(grouped).map(([name, variants]) => (
          <div key={name} className="border border-gray-200 rounded-2xl overflow-hidden">
            <div className="bg-gray-50 px-4 py-2.5 flex items-center gap-2 border-b border-gray-200">
              <span className="text-xl">{ICONS[name] || '🌊'}</span>
              <span className="font-semibold text-gray-700">{name}</span>
            </div>
            <div className="p-3 grid grid-cols-2 gap-2">
              {variants.map(activity => (
                <button
                  key={activity.id}
                  onClick={() => selectActivity(activity)}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${
                    pendingActivity?.id === activity.id
                      ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-300'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/30'
                  }`}
                >
                  <div className="font-medium text-gray-700 text-sm">{activity.duration}</div>
                  <div className="text-blue-700 font-bold mt-0.5">
                    {activity.price.toLocaleString()} {CONFIG.currency}
                    {activity.hasSubtype && (
                      <span className="text-xs font-normal text-gray-500"> /pers.</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Pending activity panel */}
      {pendingActivity && (
        <div className="mt-4 p-4 bg-blue-50 rounded-2xl border-2 border-blue-300">
          <p className="font-semibold text-blue-800 mb-3">
            ➕ Ajouter : {pendingActivity.name} · {pendingActivity.duration}
          </p>

          {/* Subtype for bouée */}
          {pendingActivity.hasSubtype && (
            <div className="mb-3">
              <p className="text-sm font-semibold text-blue-700 mb-2">🔵 Type de bouée :</p>
              <div className="grid grid-cols-2 gap-2">
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
            </div>
          )}

          {/* Person count for bouée */}
          {pendingActivity.hasSubtype && pendingSubtype && (
            <div className="mb-3">
              <p className="text-sm font-semibold text-blue-700 mb-2">👥 Nombre de personnes :</p>
              <div className="grid grid-cols-6 gap-1.5">
                {[1, 2, 3, 4, 5, 6].map(n => (
                  <button
                    key={n}
                    onClick={() => setPendingPersons(n)}
                    className={`py-2.5 rounded-xl border-2 font-bold text-base transition-all ${
                      pendingPersons === n
                        ? 'border-blue-600 bg-blue-600 text-white shadow-md'
                        : 'border-blue-200 bg-white text-blue-700 hover:border-blue-400'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <p className="text-blue-600 text-sm mt-2 text-center font-medium">
                {pendingActivity.price.toLocaleString()} {CONFIG.currency} × {pendingPersons} pers. ={' '}
                <strong>{(pendingActivity.price * pendingPersons).toLocaleString()} {CONFIG.currency}</strong>
              </p>
            </div>
          )}

          <div className="flex gap-2 mt-2">
            <button
              onClick={() => setPendingActivity(null)}
              className="flex-1 bg-white border border-gray-300 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              onClick={addToCart}
              disabled={!canAddPending}
              className="flex-1 bg-blue-700 text-white py-2.5 rounded-xl text-sm font-bold disabled:opacity-40 hover:bg-blue-800 transition-colors"
            >
              ➕ Ajouter au panier
            </button>
          </div>
        </div>
      )}

      {/* Cart */}
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
        Continuer → {cart.length > 0 && `(${cart.length} activité${cart.length > 1 ? 's' : ''})`}
      </button>
    </div>
  )
}
