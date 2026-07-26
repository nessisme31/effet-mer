import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { CONFIG } from '../../config'

interface RentalInfo {
  endTime: string
  clientFirstname: string
  clientName: string
}

interface Props {
  jetType: 'FX' | 'VX'
  quantity: number                            // ← NOUVEAU : nb de jets à sélectionner
  clientFirstname: string
  clientName: string
  onNext: (jetSkiIds: string[]) => void        // ← retourne un tableau
  onBack: () => void
  onAddToWaitingList: (jetSkiId: string) => void
  initialJetSkiIds?: string[]                 // ← pré-rempli en mode édition
}

const fmt = (iso: string) =>
  new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

export default function Step3JetSki({
  jetType, quantity, clientFirstname, clientName,
  onNext, onBack, onAddToWaitingList, initialJetSkiIds
}: Props) {
  const [rentalMap, setRentalMap] = useState<Record<string, RentalInfo>>({})
  const [selectedIds, setSelectedIds] = useState<string[]>(
    initialJetSkiIds?.length ? initialJetSkiIds : Array(quantity).fill('')
  )
  const [pendingWaiting, setPendingWaiting] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchActive = async () => {
      const { data } = await supabase
        .from('rentals')
        .select('jet_ski_id, end_time, client_firstname, client_name')
        .eq('status', 'active')
        .not('jet_ski_id', 'is', null)

      const map: Record<string, RentalInfo> = {}
      data?.forEach(r => {
        if (r.jet_ski_id) {
          // Support multi-jets stockés comme "VX4,VX5"
          r.jet_ski_id.split(',').forEach((id: string) => {
            map[id.trim()] = {
              endTime: r.end_time,
              clientFirstname: r.client_firstname,
              clientName: r.client_name,
            }
          })
        }
      })
      setRentalMap(map)
      setLoading(false)
    }
    fetchActive()
  }, [])

  const jets = CONFIG.jetSkis.filter(j => j.type === jetType)
  const allFilled = selectedIds.filter(id => id !== '').length === quantity
  const allOccupied = jets.every(j => rentalMap[j.id])

  const handleSelectJet = (slotIndex: number, jetId: string) => {
    setSelectedIds(prev => {
      const next = [...prev]
      // Clic sur le même jet → désélectionne
      next[slotIndex] = next[slotIndex] === jetId ? '' : jetId
      return next
    })
    setPendingWaiting(null)
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-3 animate-pulse">🚤</div>
        <p className="text-gray-500">Vérification des jets disponibles...</p>
      </div>
    )
  }

  // ── CAS SIMPLE : 1 seul jet (UI originale) ──────────────────
  if (quantity === 1) {
    const selected = selectedIds[0] ?? ''

    return (
      <div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Étape 3 — Choisir un jet ski</h2>
        <p className="text-gray-500 text-sm mb-5">
          Série <strong>{jetType}</strong> ·
          <span className="text-green-600 ml-2">🟢 Disponible</span>
          <span className="text-red-500 ml-3">🔴 Sorti</span>
        </p>

        <div className="grid grid-cols-2 gap-3 mb-4">
          {jets.map(jet => {
            const isOccupied = !!rentalMap[jet.id]
            const isSelected = selected === jet.id
            const isPending = pendingWaiting === jet.id
            const info = rentalMap[jet.id]

            return (
              <button
                key={jet.id}
                onClick={() =>
                  isOccupied
                    ? setPendingWaiting(pendingWaiting === jet.id ? null : jet.id)
                    : handleSelectJet(0, jet.id)
                }
                className={`p-5 rounded-2xl border-2 text-center font-bold transition-all ${
                  isOccupied
                    ? isPending
                      ? 'border-orange-400 bg-orange-50'
                      : 'border-red-200 bg-red-50'
                    : isSelected
                    ? 'border-green-500 bg-green-50 ring-2 ring-green-300'
                    : 'border-green-200 bg-white hover:border-green-400 hover:bg-green-50/50'
                }`}
              >
                <div className="text-4xl mb-2">🚤</div>
                <div className={`text-lg font-bold ${
                  isOccupied ? (isPending ? 'text-orange-700' : 'text-red-500') : 'text-gray-800'
                }`}>
                  {jet.name}
                </div>
                {isOccupied ? (
                  <div className="mt-1">
                    <div className="text-red-500 text-xs font-semibold">❌ Sorti</div>
                    {info && (
                      <div className="text-red-400 text-xs mt-0.5">Retour : {fmt(info.endTime)}</div>
                    )}
                    <div className={`text-xs mt-1 font-medium ${isPending ? 'text-orange-600' : 'text-gray-400'}`}>
                      {isPending ? '→ File d\'attente' : 'Tap pour attendre'}
                    </div>
                  </div>
                ) : (
                  <div className="text-green-600 text-sm font-medium mt-1">
                    {isSelected ? '✅ Sélectionné' : '✅ Disponible'}
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {allOccupied && !pendingWaiting && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center mb-4">
            <p className="text-red-700 font-semibold">⚠️ Tous les jets {jetType} sont sortis</p>
            <p className="text-red-500 text-sm mt-1">Appuyez sur un jet pour mettre le client en file d'attente</p>
          </div>
        )}

        {pendingWaiting && (
          <div className="bg-orange-50 border-2 border-orange-300 rounded-2xl p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">⏳</span>
              <div>
                <p className="font-bold text-orange-800">File d'attente — {pendingWaiting}</p>
                {rentalMap[pendingWaiting] && (
                  <p className="text-orange-600 text-sm">
                    Retour prévu à {fmt(rentalMap[pendingWaiting].endTime)}
                    {' · '}Client actuel : {rentalMap[pendingWaiting].clientFirstname} {rentalMap[pendingWaiting].clientName}
                  </p>
                )}
              </div>
            </div>
            <div className="bg-white rounded-xl p-3 mb-3">
              <p className="text-gray-600 text-sm">
                Ajouter <strong>{clientFirstname} {clientName}</strong> en file d'attente pour <strong>{pendingWaiting}</strong> ?
              </p>
              <p className="text-gray-400 text-xs mt-1">Vous recevrez une alerte dès que ce jet sera rendu.</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPendingWaiting(null)}
                className="flex-1 bg-white border border-gray-300 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={() => onAddToWaitingList(pendingWaiting)}
                className="flex-1 bg-orange-500 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-orange-600 transition-colors"
              >
                ✅ Confirmer la file d'attente
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={onBack} className="flex-1 bg-gray-100 text-gray-700 py-3.5 rounded-2xl font-semibold hover:bg-gray-200 transition-colors">
            ← Retour
          </button>
          <button
            onClick={() => selected && onNext([selected])}
            disabled={!selected}
            className="flex-1 bg-blue-700 text-white py-3.5 rounded-2xl font-semibold disabled:opacity-40 hover:bg-blue-800 transition-colors"
          >
            Suivant →
          </button>
        </div>
      </div>
    )
  }

  // ── CAS MULTIPLE : N jets (sélecteurs individuels) ──────────
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-2">
        Étape 3 — Assigner {quantity} jets skis ({jetType})
      </h2>
      <p className="text-gray-500 text-sm mb-5">
        Chaque jet ski réservé a son propre sélecteur. Un jet choisi disparaît des autres sélecteurs.
      </p>

      <div className="space-y-4 mb-4">
        {Array.from({ length: quantity }, (_, slotIndex) => {
          const currentSlotValue = selectedIds[slotIndex] ?? ''
          const otherSelected = selectedIds.filter((id, i) => i !== slotIndex && id !== '')

          return (
            <div key={slotIndex} className="border-2 border-gray-200 rounded-2xl p-4">
              {/* Slot header */}
              <div className="flex items-center gap-2 mb-3">
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                  currentSlotValue ? 'bg-green-500 text-white' : 'bg-blue-100 text-blue-700'
                }`}>
                  {slotIndex + 1}
                </span>
                <span className="font-semibold text-gray-700">
                  Jet Ski #{slotIndex + 1}
                </span>
                {currentSlotValue && (
                  <span className="ml-auto bg-green-100 text-green-700 text-sm font-bold px-3 py-1 rounded-full">
                    ✅ {currentSlotValue}
                  </span>
                )}
                {!currentSlotValue && (
                  <span className="ml-auto text-gray-400 text-sm">
                    À sélectionner...
                  </span>
                )}
              </div>

              {/* Jets grid for this slot */}
              <div className="grid grid-cols-3 gap-2">
                {jets.map(jet => {
                  const isOccupied = !!rentalMap[jet.id]
                  const isTakenByOtherSlot = otherSelected.includes(jet.id)
                  const isSelectedHere = currentSlotValue === jet.id
                  const isDisabled = isOccupied || isTakenByOtherSlot

                  return (
                    <button
                      key={jet.id}
                      onClick={() => !isDisabled && handleSelectJet(slotIndex, jet.id)}
                      disabled={isDisabled}
                      className={`p-3 rounded-xl border-2 text-center transition-all ${
                        isDisabled
                          ? 'border-red-200 bg-red-50 opacity-60 cursor-not-allowed'
                          : isSelectedHere
                          ? 'border-green-500 bg-green-50 ring-2 ring-green-300'
                          : 'border-green-200 bg-white hover:border-green-400 hover:bg-green-50/50'
                      }`}
                    >
                      <div className="text-2xl mb-1">🚤</div>
                      <div className={`font-bold text-sm ${isDisabled ? 'text-red-400' : 'text-gray-800'}`}>
                        {jet.name}
                      </div>
                      <div className={`text-xs mt-0.5 font-medium ${
                        isOccupied ? 'text-red-400'
                        : isTakenByOtherSlot ? 'text-orange-500'
                        : isSelectedHere ? 'text-green-600'
                        : 'text-green-600'
                      }`}>
                        {isOccupied
                          ? `❌ Sorti — ${fmt(rentalMap[jet.id].endTime)}`
                          : isTakenByOtherSlot
                          ? '⬆️ Déjà assigné'
                          : isSelectedHere
                          ? '✅ Choisi'
                          : '✅ Disponible'}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Barre de progression */}
      <div className={`rounded-xl p-3 mb-4 text-center ${allFilled ? 'bg-green-50 border border-green-200' : 'bg-blue-50 border border-blue-200'}`}>
        <p className={`font-semibold ${allFilled ? 'text-green-800' : 'text-blue-800'}`}>
          {selectedIds.filter(id => id !== '').length} / {quantity} jets assignés
          {allFilled ? ' ✅' : ' ...'}
        </p>
        {!allFilled && (
          <p className="text-blue-500 text-sm mt-0.5">Sélectionnez un jet pour chaque emplacement</p>
        )}
      </div>

      <div className="flex gap-3">
        <button onClick={onBack} className="flex-1 bg-gray-100 text-gray-700 py-3.5 rounded-2xl font-semibold hover:bg-gray-200 transition-colors">
          ← Retour
        </button>
        <button
          onClick={() => allFilled && onNext(selectedIds.filter(id => id !== ''))}
          disabled={!allFilled}
          className="flex-1 bg-blue-700 text-white py-3.5 rounded-2xl font-semibold disabled:opacity-40 hover:bg-blue-800 transition-colors"
        >
          Suivant →
        </button>
      </div>
    </div>
  )
}
