import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { CONFIG } from '../../config'

// ── Types ──────────────────────────────────────────────────────────────────

export interface JetSlot {
  index: number           // index unique du slot
  label: string           // ex: "Jet Ski VX · 30 min"
  jetType: 'VX' | 'FX'   // type requis pour ce slot
}

interface RentalInfo {
  endTime: string
  clientFirstname: string
  clientName: string
}

interface Props {
  slots: JetSlot[]
  clientFirstname: string
  clientName: string
  onNext: (jetSkiIds: string[]) => void   // un ID par slot, dans l'ordre
  onBack: () => void
  onAddToWaitingList: (jetSkiId: string) => void
}

// ── Helpers ────────────────────────────────────────────────────────────────

const fmt = (iso: string) =>
  new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

// ── Composant ──────────────────────────────────────────────────────────────

export default function StepJetSkiAssign({
  slots, clientFirstname, clientName, onNext, onBack, onAddToWaitingList
}: Props) {
  // Map jetId → info location active
  const [rentalMap, setRentalMap] = useState<Record<string, RentalInfo>>({})
  // Un ID par slot ('' = pas encore choisi)
  const [selections, setSelections] = useState<string[]>(slots.map(() => ''))
  const [pendingWaiting, setPendingWaiting] = useState<{ slotIndex: number; jetId: string } | null>(null)
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
          // Support stockage CSV multi-jets
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

  // Tous les slots remplis ?
  const allFilled = selections.every(id => id !== '')

  const handleSelect = (slotIndex: number, jetId: string) => {
    setSelections(prev => {
      const next = [...prev]
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

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-1">Attribution des jets skis</h2>
      <p className="text-gray-500 text-sm mb-5">
        Assignez un jet physique à chacun des {slots.length} jets réservés.
      </p>

      {/* ── Un bloc par slot ─────────────────────────────── */}
      <div className="space-y-5 mb-5">
        {slots.map((slot, slotIndex) => {
          const currentValue = selections[slotIndex]
          // Jets déjà choisis dans les AUTRES slots (évite les doublons)
          const takenByOthers = selections.filter((id, i) => i !== slotIndex && id !== '')
          // Jets physiques du bon type
          const jetsOfType = CONFIG.jetSkis.filter(j => j.type === slot.jetType)

          return (
            <div key={slot.index} className="border-2 border-gray-200 rounded-2xl p-4">
              {/* En-tête du slot */}
              <div className="flex items-center gap-2 mb-3">
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                  currentValue ? 'bg-green-500 text-white' : 'bg-blue-100 text-blue-700'
                }`}>
                  {slotIndex + 1}
                </span>
                <div>
                  <p className="font-semibold text-gray-800 text-sm">{slot.label}</p>
                  <p className="text-xs text-gray-400">Série {slot.jetType}</p>
                </div>
                {currentValue && (
                  <span className="ml-auto bg-green-100 text-green-700 text-sm font-bold px-3 py-1 rounded-full">
                    ✅ {currentValue}
                  </span>
                )}
                {!currentValue && (
                  <span className="ml-auto text-gray-400 text-xs">À assigner...</span>
                )}
              </div>

              {/* Grille des jets disponibles pour ce type */}
              <div className="grid grid-cols-3 gap-2">
                {jetsOfType.map(jet => {
                  const isOccupied = !!rentalMap[jet.id]
                  const isTakenByOther = takenByOthers.includes(jet.id)
                  const isSelectedHere = currentValue === jet.id
                  const isDisabled = isOccupied || isTakenByOther
                  const isPendingWait =
                    pendingWaiting?.slotIndex === slotIndex && pendingWaiting?.jetId === jet.id

                  return (
                    <button
                      key={jet.id}
                      onClick={() => {
                        if (isOccupied) {
                          setPendingWaiting(
                            isPendingWait ? null : { slotIndex, jetId: jet.id }
                          )
                        } else if (!isTakenByOther) {
                          handleSelect(slotIndex, jet.id)
                        }
                      }}
                      className={`p-3 rounded-xl border-2 text-center transition-all ${
                        isTakenByOther
                          ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                          : isOccupied
                          ? isPendingWait
                            ? 'border-orange-400 bg-orange-50'
                            : 'border-red-200 bg-red-50'
                          : isSelectedHere
                          ? 'border-green-500 bg-green-50 ring-2 ring-green-300'
                          : 'border-green-200 bg-white hover:border-green-400 hover:bg-green-50/50'
                      }`}
                    >
                      <div className="text-2xl mb-1">🚤</div>
                      <div className={`font-bold text-sm ${
                        isTakenByOther ? 'text-gray-400'
                        : isOccupied ? 'text-red-500'
                        : 'text-gray-800'
                      }`}>
                        {jet.name}
                      </div>
                      <div className={`text-xs mt-0.5 font-medium ${
                        isTakenByOther ? 'text-gray-400'
                        : isOccupied ? 'text-red-400'
                        : isSelectedHere ? 'text-green-600'
                        : 'text-green-600'
                      }`}>
                        {isTakenByOther ? '⬆️ Assigné'
                         : isOccupied ? `❌ ${fmt(rentalMap[jet.id].endTime)}`
                         : isSelectedHere ? '✅ Choisi'
                         : '✅ Dispo'}
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Popup file d'attente pour ce slot */}
              {pendingWaiting?.slotIndex === slotIndex && (
                <div className="mt-3 bg-orange-50 border border-orange-300 rounded-xl p-3">
                  <p className="font-semibold text-orange-800 text-sm mb-1">
                    ⏳ File d'attente — {pendingWaiting.jetId}
                  </p>
                  {rentalMap[pendingWaiting.jetId] && (
                    <p className="text-orange-600 text-xs mb-2">
                      Retour prévu : {fmt(rentalMap[pendingWaiting.jetId].endTime)}
                      {' · '}
                      Client : {rentalMap[pendingWaiting.jetId].clientFirstname}{' '}
                      {rentalMap[pendingWaiting.jetId].clientName}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPendingWaiting(null)}
                      className="flex-1 bg-white border border-gray-300 text-gray-600 py-1.5 rounded-lg text-xs font-medium"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={() => {
                        onAddToWaitingList(pendingWaiting.jetId)
                        setPendingWaiting(null)
                      }}
                      className="flex-1 bg-orange-500 text-white py-1.5 rounded-lg text-xs font-bold hover:bg-orange-600"
                    >
                      ✅ Confirmer l'attente
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Barre de progression ────────────────────────── */}
      <div className={`rounded-xl p-3 mb-5 text-center ${
        allFilled ? 'bg-green-50 border border-green-200' : 'bg-blue-50 border border-blue-100'
      }`}>
        <p className={`font-semibold text-sm ${allFilled ? 'text-green-800' : 'text-blue-700'}`}>
          {selections.filter(id => id !== '').length} / {slots.length} jets assignés
          {allFilled ? ' ✅' : ''}
        </p>
        {!allFilled && (
          <p className="text-blue-500 text-xs mt-0.5">
            Sélectionnez un jet physique pour chaque emplacement
          </p>
        )}
      </div>

      {/* ── Boutons ─────────────────────────────────────── */}
      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 bg-gray-100 text-gray-700 py-3.5 rounded-2xl font-semibold hover:bg-gray-200 transition-colors"
        >
          ← Retour
        </button>
        <button
          onClick={() => allFilled && onNext(selections)}
          disabled={!allFilled}
          className="flex-1 bg-blue-700 text-white py-3.5 rounded-2xl font-semibold disabled:opacity-40 hover:bg-blue-800 transition-colors"
        >
          Suivant →
        </button>
      </div>
    </div>
  )
}
