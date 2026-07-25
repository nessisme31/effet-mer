import { useState } from 'react'
import { CONFIG, ActivityConfig } from '../../config'

interface Props {
  onNext: (activity: ActivityConfig, subtype?: string) => void
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

export default function Step1Activity({ onNext }: Props) {
  const [selectedActivity, setSelectedActivity] = useState<ActivityConfig | null>(null)
  const [selectedSubtype, setSelectedSubtype] = useState('')

  // Group by activity name
  const grouped = CONFIG.activities.reduce((acc, act) => {
    if (!acc[act.name]) acc[act.name] = []
    acc[act.name].push(act)
    return acc
  }, {} as Record<string, ActivityConfig[]>)

  const canContinue = selectedActivity && (!selectedActivity.hasSubtype || selectedSubtype)

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-6">Étape 1 — Choisir une activité</h2>

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
                  onClick={() => { setSelectedActivity(activity); setSelectedSubtype('') }}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${
                    selectedActivity?.id === activity.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/30'
                  }`}
                >
                  <div className="font-medium text-gray-700 text-sm">{activity.duration}</div>
                  <div className="text-blue-700 font-bold mt-0.5">
                    {activity.price.toLocaleString()} {CONFIG.currency}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Subtype selection for Bouée */}
      {selectedActivity?.hasSubtype && (
        <div className="mt-4 p-4 bg-orange-50 rounded-2xl border border-orange-200">
          <p className="font-semibold text-orange-800 mb-3">🔵 Type de bouée :</p>
          <div className="grid grid-cols-2 gap-2">
            {CONFIG.boueeSubtypes.map(subtype => (
              <button
                key={subtype}
                onClick={() => setSelectedSubtype(subtype)}
                className={`py-2.5 px-4 rounded-xl border-2 font-medium text-sm transition-all ${
                  selectedSubtype === subtype
                    ? 'border-orange-500 bg-orange-100 text-orange-800'
                    : 'border-gray-200 hover:border-orange-300 text-gray-700 bg-white'
                }`}
              >
                {subtype}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      {selectedActivity && (
        <div className="mt-4 p-4 bg-green-50 rounded-2xl border border-green-200">
          <p className="text-green-800 font-medium">
            ✅ {selectedActivity.name}
            {selectedSubtype && ` — ${selectedSubtype}`}
            {' · '}{selectedActivity.duration}
            {' · '}<strong>{selectedActivity.price.toLocaleString()} {CONFIG.currency}</strong>
          </p>
        </div>
      )}

      <button
        onClick={() => canContinue && onNext(selectedActivity!, selectedSubtype || undefined)}
        disabled={!canContinue}
        className="mt-6 w-full bg-blue-700 text-white py-3.5 rounded-2xl font-semibold disabled:opacity-40 hover:bg-blue-800 transition-colors text-lg"
      >
        Suivant →
      </button>
    </div>
  )
}
