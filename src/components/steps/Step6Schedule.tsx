import { useState } from 'react'
import { ActivityConfig } from '../../config'

interface Props {
  activity: ActivityConfig
  onComplete: (startTime: string, endTime: string) => void
  onBack: () => void
  isSubmitting: boolean
}

const pad = (n: number) => String(n).padStart(2, '0')

const formatForInput = (date: Date): string => {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const addMinutes = (date: Date, minutes: number): Date =>
  new Date(date.getTime() + minutes * 60000)

export default function Step6Schedule({ activity, onComplete, onBack, isSubmitting }: Props) {
  const now = new Date()
  const [startTime, setStartTime] = useState(formatForInput(now))
  const [endTime, setEndTime] = useState(formatForInput(addMinutes(now, activity.durationMinutes)))

  const handleStartChange = (value: string) => {
    setStartTime(value)
    const start = new Date(value)
    if (!isNaN(start.getTime())) {
      setEndTime(formatForInput(addMinutes(start, activity.durationMinutes)))
    }
  }

  const startDate = new Date(startTime)
  const endDate = new Date(endTime)
  const fmtTime = (d: Date) =>
    isNaN(d.getTime()) ? '--:--' : d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-2">Étape 6 — Horaires</h2>
      <p className="text-gray-500 text-sm mb-6">
        Durée prévue : <strong>{activity.duration}</strong>
      </p>

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            🕐 Heure de départ
          </label>
          <input
            type="datetime-local"
            value={startTime}
            onChange={e => handleStartChange(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none text-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            🏁 Heure de retour prévue
          </label>
          <p className="text-gray-400 text-xs mb-2">Calculée automatiquement · modifiable si besoin</p>
          <input
            type="datetime-local"
            value={endTime}
            onChange={e => setEndTime(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none text-lg"
          />
        </div>
      </div>

      <div className="mt-5 bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
        <p className="text-green-700 font-semibold text-lg">
          {fmtTime(startDate)} → {fmtTime(endDate)}
        </p>
        <p className="text-green-600 text-sm mt-1">{activity.duration} de location</p>
      </div>

      <div className="flex gap-3 mt-6">
        <button
          onClick={onBack}
          disabled={isSubmitting}
          className="flex-1 bg-gray-100 text-gray-700 py-3.5 rounded-2xl font-semibold hover:bg-gray-200 transition-colors disabled:opacity-40"
        >
          ← Retour
        </button>
        <button
          onClick={() => onComplete(startTime, endTime)}
          disabled={isSubmitting}
          className="flex-1 bg-green-600 text-white py-3.5 rounded-2xl font-bold disabled:opacity-50 hover:bg-green-700 transition-colors text-lg"
        >
          {isSubmitting ? '⏳ Enregistrement...' : '✅ Valider la location'}
        </button>
      </div>
    </div>
  )
}
