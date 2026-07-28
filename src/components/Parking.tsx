import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { CONFIG } from '../config'

interface Parking {
  id: string
  type: string
  price: number
  client_name: string
  description: string | null
  payment_method: string
  status: string
  created_at: string
}

const PARKING_TYPES = [
  { id: 'jet-ski', label: 'Parking Jet Ski', price: 300, icon: '🚤' },
]

const fmt = (iso: string) =>
  new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })

const elapsed = (iso: string) => {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (diff < 60) return `${diff} min`
  const h = Math.floor(diff / 60)
  const m = diff % 60
  return m > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${h}h00`
}

export default function Parking() {
  const [parkings, setParkings] = useState<Parking[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [payingParkingId, setPayingParkingId] = useState<string | null>(null)

  // Form state
  const [selectedType, setSelectedType] = useState(PARKING_TYPES[0])
  const [clientName, setClientName] = useState('')
  const [description, setDescription] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')

  const fetchParkings = async () => {
    const { data } = await supabase
      .from('parkings')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
    setParkings(data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchParkings()
  }, [])

  const resetForm = () => {
    setSelectedType(PARKING_TYPES[0])
    setClientName('')
    setDescription('')
    setPaymentMethod('')
    setShowForm(false)
  }

  const handleSave = async () => {
    if (!clientName.trim() || !paymentMethod) return
    setSaving(true)
    const { error } = await supabase.from('parkings').insert({
      type: selectedType.label,
      price: selectedType.price,
      client_name: clientName.trim().toUpperCase(),
      description: description.trim() || null,
      payment_method: paymentMethod,
      status: 'active',
    })
    if (error) {
      alert('❌ Erreur lors de la création du parking. Vérifiez votre connexion.')
    } else {
      resetForm()
      fetchParkings()
    }
    setSaving(false)
  }

  const handleFinish = async (parking: Parking) => {
    if (!confirm(`Marquer le parking de "${parking.client_name}" comme terminé ?`)) return
    await supabase.from('parkings').update({ status: 'archived' }).eq('id', parking.id)
    fetchParkings()
  }

  const handleConfirmPayment = async (parkingId: string, method: string) => {
    await supabase
      .from('parkings')
      .update({ payment_method: method })
      .eq('id', parkingId)
    setPayingParkingId(null)
    fetchParkings()
  }

  const canSave = clientName.trim().length > 0 && paymentMethod.length > 0

  if (loading) return <div className="text-center py-16 text-gray-400">⏳ Chargement...</div>

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">🅿️ Parking</h2>
          <p className="text-gray-500 text-sm mt-1">{parkings.length} parking(s) en cours</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-blue-800 transition-colors shadow"
        >
          {showForm ? '✕ Annuler' : '➕ Nouveau parking'}
        </button>
      </div>

      {/* ── Formulaire nouveau parking ── */}
      {showForm && (
        <div className="bg-white rounded-2xl border-2 border-blue-200 p-6 mb-6 shadow-sm">
          <h3 className="font-bold text-gray-800 text-lg mb-5">Nouveau parking</h3>

          {/* Étape 1 : Type */}
          <div className="mb-5">
            <p className="text-sm font-semibold text-gray-600 mb-2">
              <span className="bg-blue-700 text-white text-xs rounded-full w-5 h-5 inline-flex items-center justify-center mr-2">1</span>
              Type de parking
            </p>
            <div className="flex gap-2">
              {PARKING_TYPES.map(type => (
                <button
                  key={type.id}
                  onClick={() => setSelectedType(type)}
                  className={`flex-1 py-3 px-4 rounded-xl border-2 font-semibold text-sm transition-all flex items-center gap-2 ${
                    selectedType.id === type.id
                      ? 'border-blue-500 bg-blue-50 text-blue-800'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-blue-300'
                  }`}
                >
                  <span className="text-xl">{type.icon}</span>
                  <span>{type.label}</span>
                  <span className="ml-auto font-bold text-blue-700">{type.price} {CONFIG.currency}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Étape 2 : Client + Description */}
          <div className="mb-5">
            <p className="text-sm font-semibold text-gray-600 mb-2">
              <span className="bg-blue-700 text-white text-xs rounded-full w-5 h-5 inline-flex items-center justify-center mr-2">2</span>
              Nom du client &amp; description du jet
            </p>
            <input
              type="text"
              placeholder="Nom du client *"
              value={clientName}
              onChange={e => setClientName(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 mb-2"
            />
            <textarea
              placeholder="Description du jet (marque, couleur, immatriculation, remarques...)"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Étape 3 : Paiement + Valider */}
          <div className="mb-5">
            <p className="text-sm font-semibold text-gray-600 mb-2">
              <span className="bg-blue-700 text-white text-xs rounded-full w-5 h-5 inline-flex items-center justify-center mr-2">3</span>
              Mode de paiement
            </p>
            <div className="grid grid-cols-3 gap-2 mb-2">
              {CONFIG.paymentMethods.map(method => {
                const icons: Record<string, string> = { 'Espèces': '💵', 'Carte bancaire': '💳', 'Virement': '🏦' }
                return (
                  <button
                    key={method}
                    onClick={() => setPaymentMethod(method)}
                    className={`py-3 rounded-xl border-2 text-sm font-semibold transition-all flex flex-col items-center gap-1 ${
                      paymentMethod === method
                        ? 'border-blue-500 bg-blue-50 text-blue-800'
                        : 'border-gray-200 text-gray-600 hover:border-blue-300'
                    }`}
                  >
                    <span className="text-xl">{icons[method] || '💰'}</span>
                    <span>{method}</span>
                  </button>
                )
              })}
            </div>
            {/* Bouton En attente de paiement */}
            <button
              onClick={() => setPaymentMethod('En attente de paiement')}
              className={`w-full py-3 rounded-xl border-2 text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                paymentMethod === 'En attente de paiement'
                  ? 'border-red-400 bg-red-50 text-red-700'
                  : 'border-gray-200 text-gray-600 hover:border-red-300 hover:bg-red-50/30'
              }`}
            >
              <span className="text-xl">⏳</span>
              <span>En attente de paiement</span>
            </button>
          </div>

          {/* Résumé + bouton valider */}
          {canSave && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4 flex items-center gap-3">
              <span className="text-2xl">✅</span>
              <div className="text-sm text-green-800">
                <strong>{clientName.toUpperCase()}</strong> · {selectedType.label} · {selectedType.price} {CONFIG.currency} · {paymentMethod}
              </div>
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={!canSave || saving}
            className="w-full bg-blue-700 text-white py-3.5 rounded-2xl font-bold text-lg disabled:opacity-40 hover:bg-blue-800 transition-colors"
          >
            {saving ? '⏳ Enregistrement...' : '✅ Valider le parking'}
          </button>
        </div>
      )}

      {/* ── Liste des parkings actifs ── */}
      {parkings.length === 0 && !showForm ? (
        <div className="text-center py-20">
          <div className="text-7xl mb-4">🅿️</div>
          <p className="text-xl text-gray-500 font-medium">Aucun parking en cours</p>
          <p className="text-gray-400 text-sm mt-2">Cliquez sur "Nouveau parking" pour commencer</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-6 bg-blue-700 text-white px-8 py-3 rounded-xl font-semibold hover:bg-blue-800 transition-colors"
          >
            ➕ Nouveau parking
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {parkings.map(parking => (
            <div key={parking.id} className={`rounded-2xl border-2 p-5 shadow-sm hover:shadow-md transition-shadow ${
              parking.payment_method === 'En attente de paiement'
                ? 'bg-red-50 border-red-300'
                : 'bg-white border-gray-100'
            }`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-0.5 rounded-full">🅿️ {parking.type}</span>
                    <span className="bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full">🟢 En cours</span>
                  </div>
                  <p className="font-bold text-gray-800 text-lg">{parking.client_name}</p>
                  {parking.description && (
                    <p className="text-gray-500 text-sm mt-0.5">📝 {parking.description}</p>
                  )}
                </div>
                <div className="text-right flex-shrink-0 ml-3">
                  <p className="font-bold text-gray-800 text-xl">{parking.price.toLocaleString()} {CONFIG.currency}</p>
                  {parking.payment_method === 'En attente de paiement' ? (
                    <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full mt-1">
                      ⏳ Paiement en attente
                    </span>
                  ) : (
                    <p className="text-gray-400 text-xs">{parking.payment_method}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex gap-2 text-xs text-gray-500">
                  <span className="bg-white/70 px-2 py-0.5 rounded-lg">
                    🕐 Depuis {fmt(parking.created_at)} ({elapsed(parking.created_at)})
                  </span>
                  <span className="bg-white/70 px-2 py-0.5 rounded-lg">
                    📅 {fmtDate(parking.created_at)}
                  </span>
                </div>
                <div className="flex gap-2 items-center">
                  {parking.payment_method === 'En attente de paiement' && (
                    <button
                      onClick={() => setPayingParkingId(
                        payingParkingId === parking.id ? null : parking.id
                      )}
                      className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl font-bold text-sm transition-colors shadow"
                    >
                      💳 Paiement reçu
                    </button>
                  )}
                  <button
                    onClick={() => handleFinish(parking)}
                    className="bg-green-500 hover:bg-green-600 text-white px-5 py-2 rounded-xl font-bold text-sm transition-colors shadow"
                  >
                    ✅ Fini
                  </button>
                </div>
              </div>

              {/* Mini-sélecteur mode de paiement */}
              {payingParkingId === parking.id && (
                <div className="mt-3 bg-white border-2 border-red-200 rounded-xl p-3">
                  <p className="text-sm font-semibold text-gray-700 mb-2">
                    💳 Comment a-t-il payé ?
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {CONFIG.paymentMethods.map(method => {
                      const icons: Record<string, string> = { 'Espèces': '💵', 'Carte bancaire': '💳', 'Virement': '🏦' }
                      return (
                        <button
                          key={method}
                          onClick={() => handleConfirmPayment(parking.id, method)}
                          className="py-2.5 rounded-xl border-2 border-gray-200 text-sm font-semibold hover:border-green-400 hover:bg-green-50 hover:text-green-700 transition-all flex flex-col items-center gap-1"
                        >
                          <span>{icons[method] || '💰'}</span>
                          <span className="text-xs">{method}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
