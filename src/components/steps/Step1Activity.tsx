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
  // Pour Jet Ski VX/FX — menu déroulant de durée
  const [pendingJetVariants, setPendingJetVariants] = useState<ActivityConfig[] | null>(null)
  const [pendingJetId, setPendingJetId] = useState('')
  // Feedback visuel quand on ajoute au panier
  const [lastAdded, setLastAdded] = useState<string | null>(null)

  const grouped = CONFIG.activities.reduce((acc, act) => {
    if (!acc[act.name]) acc[act.name] = []
    acc[act.name].push(act)
    return acc
  }, {} as Record<string, ActivityConfig[]>)

  // Image représentative du groupe (depuis la première variante)
  const groupImage = (name: string): string | null => grouped[name]?.[0]?.image ?? null

  const cartTotal = cart.reduce((sum, item) => sum + item.itemPrice, 0)

  // Ouvrir le panel durée pour VX/FX
  const openJetPanel = (variants: ActivityConfig[]) => {
    setPendingJetVariants(variants)
    setPendingJetId(variants[0].id)
    setPendingBouee(null) // fermer l'autre panel si ouvert
  }

  // Ajouter le jet ski au panier après sélection de la durée
  const addJetToCart = () => {
    const activity = pendingJetVariants!.find(a => a.id === pendingJetId)
    if (!activity) return
    const newItem: CartItem = {
      cartId: Math.random().toString(36).substr(2, 9),
      activity,
      itemPrice: activity.price,
    }
    setCart(prev => [...prev, newItem])
    setLastAdded(activity.id)
    setTimeout(() => setLastAdded(null), 1500)
    setPendingJetVariants(null)
    setPendingJetId('')
  }

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

      {/* ── Grille de cartes produit ── */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {Object.entries(grouped).map(([name, variants]) => {
          const isJetSki = variants[0].requiresJetSki
          const isPendingJetGroup = pendingJetVariants && pendingJetVariants[0].name === name
          const img = groupImage(name)
          const isBoueeOpen = !!pendingBouee && pendingBouee.name === name

          return (
            <div key={name} className={`border-2 rounded-2xl overflow-hidden flex flex-col transition-all shadow-sm ${
              isPendingJetGroup ? 'border-blue-500 shadow-blue-100' :
              isBoueeOpen ? 'border-orange-400 shadow-orange-100' :
              'border-gray-200 hover:border-blue-300 hover:shadow-md'
            }`}>

              {/* ── Photo produit ── */}
              <div className="bg-gray-50 h-32 sm:h-40 flex items-center justify-center p-3">
                {img
                  ? <img src={img} alt={name} className="h-full w-full object-contain drop-shadow-sm" />
                  : <span className="text-5xl">{ICONS[name] || '🌊'}</span>
                }
              </div>

              {/* ── Nom de l'activité ── */}
              <div className="px-3 pt-2">
                <p className="font-bold text-gray-800 text-sm leading-tight">{name}</p>
              </div>

              {/* ── Boutons durée ── */}
              <div className="px-3 pb-3 pt-2">
                {isJetSki ? (
                  // Jet Ski → bouton "Choisir la durée"
                  <button
                    onClick={() => isPendingJetGroup ? setPendingJetVariants(null) : openJetPanel(variants)}
                    className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all ${
                      isPendingJetGroup
                        ? 'bg-blue-600 text-white'
                        : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    }`}
                  >
                    {isPendingJetGroup ? '▼ Durée' : '▶ Choisir la durée'}
                  </button>
                ) : (
                  // Autres activités → boutons de durée inline
                  <div className="space-y-1.5">
                    {variants.map(activity => {
                      const justAdded = lastAdded === activity.id
                      return (
                        <button
                          key={activity.id}
                          onClick={() => {
                            if (activity.hasSubtype) {
                              setPendingBouee(activity)
                              setPendingSubtype('')
                              setPendingPersons(1)
                              setPendingJetVariants(null)
                            } else {
                              addDirectToCart(activity)
                            }
                          }}
                          className={`w-full py-2 px-2.5 rounded-xl border-2 text-xs font-semibold transition-all flex justify-between items-center active:scale-95 ${
                            justAdded
                              ? 'border-green-500 bg-green-50 text-green-700'
                              : pendingBouee?.id === activity.id
                              ? 'border-orange-400 bg-orange-50 text-orange-700'
                              : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50 text-gray-700'
                          }`}
                        >
                          <span>{justAdded ? '✅ Ajouté !' : activity.duration}</span>
                          {!justAdded && (
                            <span className="font-bold text-blue-700">
                              {activity.price.toLocaleString()} {CONFIG.currency}
                              {activity.hasSubtype && <span className="text-gray-400 font-normal">/p</span>}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Panel Jet Ski : sélecteur de durée ── */}
      {pendingJetVariants && (
        <div className="mb-4 p-4 bg-blue-50 rounded-2xl border-2 border-blue-300">
          <p className="text-sm font-bold text-blue-700 mb-2">⏱️ {pendingJetVariants[0].name} — Choisir la durée</p>
          <select
            value={pendingJetId}
            onChange={e => setPendingJetId(e.target.value)}
            className="w-full border-2 border-blue-300 rounded-xl px-4 py-3 text-base font-medium bg-white outline-none focus:ring-2 focus:ring-blue-400 mb-3"
          >
            {pendingJetVariants.map(act => (
              <option key={act.id} value={act.id}>
                {act.duration} · {act.price.toLocaleString()} {CONFIG.currency}
              </option>
            ))}
          </select>
          {(() => {
            const sel = pendingJetVariants.find(a => a.id === pendingJetId)
            return sel ? (
              <div className="bg-white rounded-xl px-4 py-3 border border-blue-200 text-center mb-3">
                <p className="text-blue-500 text-xs font-medium mb-0.5">{sel.name} · {sel.duration}</p>
                <p className="text-3xl font-bold text-blue-800">{sel.price.toLocaleString()} {CONFIG.currency}</p>
              </div>
            ) : null
          })()}
          <div className="flex gap-2">
            <button onClick={() => setPendingJetVariants(null)}
              className="flex-1 bg-white border border-gray-300 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50">
              Annuler
            </button>
            <button onClick={addJetToCart}
              className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors">
              ➕ Ajouter au panier
            </button>
          </div>
        </div>
      )}

      {/* Panel bouée (uniquement pour Bouée Tractée) */}
      {pendingBouee && (
        <div className="mt-4 p-4 bg-orange-50 rounded-2xl border-2 border-orange-300">
          <p className="font-semibold text-orange-800 mb-3">
            🔵 {pendingBouee.name} — {pendingBouee.duration}
          </p>

          {/* Sous-type avec photos */}
          <p className="text-sm font-medium text-orange-700 mb-2">Type de bouée :</p>
          <div className="grid grid-cols-2 gap-2 mb-3">
            {CONFIG.boueeSubtypes.map(subtype => {
              const subtypeImg = (CONFIG.boueeSubtypeImages as Record<string, string>)?.[subtype]
              return (
                <button
                  key={subtype}
                  onClick={() => setPendingSubtype(subtype)}
                  className={`rounded-xl border-2 overflow-hidden transition-all ${
                    pendingSubtype === subtype
                      ? 'border-orange-500 shadow-md'
                      : 'border-gray-200 bg-white hover:border-orange-300'
                  }`}
                >
                  {subtypeImg && (
                    <div className="bg-gray-50 h-20 flex items-center justify-center p-2">
                      <img src={subtypeImg} alt={subtype} className="h-full w-full object-contain" />
                    </div>
                  )}
                  <div className={`py-1.5 px-2 text-xs font-bold text-center ${
                    pendingSubtype === subtype ? 'bg-orange-100 text-orange-800' : 'bg-white text-gray-700'
                  }`}>
                    {subtype}
                  </div>
                </button>
              )
            })}
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
