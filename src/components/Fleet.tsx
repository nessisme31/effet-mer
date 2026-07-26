import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { CONFIG } from '../config'

interface ActiveRental {
  id: string
  jet_ski_id: string | null
  client_firstname: string
  client_name: string
  activity_name: string
  activity_subtype: string | null
  start_time: string
  end_time: string
  duration: string
}

const fmt = (iso: string) =>
  new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

// Retourne le temps restant ou le retard
const timeStatus = (endTime: string) => {
  const diff = Math.floor((new Date(endTime).getTime() - Date.now()) / 60000)
  if (diff > 0) return { label: `${diff} min restante${diff > 1 ? 's' : ''}`, overdue: false }
  const late = Math.abs(diff)
  return { label: `En retard de ${late} min`, overdue: true }
}

export default function Fleet() {
  const [rentalMap, setRentalMap] = useState<Record<string, ActiveRental>>({})
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)

  const fetchActive = useCallback(async () => {
    const { data } = await supabase
      .from('rentals')
      .select('id, jet_ski_id, client_firstname, client_name, activity_name, activity_subtype, start_time, end_time, duration')
      .eq('status', 'active')
      .not('jet_ski_id', 'is', null)

    const map: Record<string, ActiveRental> = {}
    data?.forEach(r => {
      if (r.jet_ski_id) {
        // Un jet peut avoir plusieurs IDs (ex: "VX4,VX5") — on décompose
        const ids = r.jet_ski_id.split(',').map((s: string) => s.trim()).filter(Boolean)
        ids.forEach((id: string) => {
          map[id] = r
        })
      }
    })
    setRentalMap(map)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchActive()
    // Refresh toutes les 30s depuis Supabase
    const dataInterval = setInterval(fetchActive, 30000)
    // Re-render toutes les 60s pour mettre à jour le compte à rebours
    const tickInterval = setInterval(() => setTick(t => t + 1), 60000)
    return () => {
      clearInterval(dataInterval)
      clearInterval(tickInterval)
    }
  }, [fetchActive])

  const availableCount = CONFIG.jetSkis.filter(j => !rentalMap[j.id]).length
  const occupiedCount  = CONFIG.jetSkis.filter(j => !!rentalMap[j.id]).length

  if (loading) return <div className="text-center py-16 text-gray-400">⏳ Chargement...</div>

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">🚤 Ma Flotte</h2>
          <p className="text-gray-500 text-sm mt-1">Temps réel · actualisation automatique</p>
        </div>
        <button
          onClick={() => { setLoading(true); fetchActive() }}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
        >
          🔄 Actualiser
        </button>
      </div>

      {/* Résumé */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
          <div className="text-3xl font-bold text-green-700">{availableCount}</div>
          <div className="text-green-600 text-sm font-medium mt-1">🟢 Disponible{availableCount > 1 ? 's' : ''}</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
          <div className="text-3xl font-bold text-red-700">{occupiedCount}</div>
          <div className="text-red-600 text-sm font-medium mt-1">🔴 En mer</div>
        </div>
      </div>

      {/* Grille des jets */}
      <div className="space-y-3">
        {/* D'abord les jets EN MER, puis les DISPONIBLES */}
        {[
          ...CONFIG.jetSkis.filter(j => !!rentalMap[j.id]),
          ...CONFIG.jetSkis.filter(j => !rentalMap[j.id]),
        ].map(jet => {
          const rental = rentalMap[jet.id]
          const isOccupied = !!rental

          if (isOccupied) {
            const status = timeStatus(rental.end_time)
            return (
              <div
                key={jet.id}
                className={`rounded-2xl border-2 p-5 ${
                  status.overdue
                    ? 'bg-red-50 border-red-300'
                    : 'bg-white border-orange-200'
                }`}
              >
                {/* Ligne du haut : nom jet + badge */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold ${
                      status.overdue ? 'bg-red-200' : 'bg-orange-100'
                    }`}>
                      🚤
                    </div>
                    <div>
                      <p className="font-bold text-gray-800 text-lg">{jet.name}</p>
                      <p className="text-gray-500 text-xs">{jet.type}</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    status.overdue
                      ? 'bg-red-200 text-red-800'
                      : 'bg-orange-100 text-orange-700'
                  }`}>
                    {status.overdue ? '🔴 En retard' : '🟡 En mer'}
                  </span>
                </div>

                {/* Client + activité */}
                <div className="mb-3">
                  <p className="font-semibold text-gray-800">
                    {rental.client_firstname} {rental.client_name}
                  </p>
                  <p className="text-gray-500 text-sm">
                    {rental.activity_name}{rental.activity_subtype ? ` — ${rental.activity_subtype}` : ''} · {rental.duration}
                  </p>
                </div>

                {/* Horaires */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-white rounded-xl p-2.5 border border-gray-100">
                    <p className="text-gray-400 text-xs mb-0.5">DÉPART</p>
                    <p className="font-bold text-gray-800">{fmt(rental.start_time)}</p>
                  </div>
                  <div className="bg-white rounded-xl p-2.5 border border-gray-100">
                    <p className="text-gray-400 text-xs mb-0.5">RETOUR</p>
                    <p className="font-bold text-gray-800">{fmt(rental.end_time)}</p>
                  </div>
                  <div className={`rounded-xl p-2.5 ${
                    status.overdue ? 'bg-red-100' : 'bg-green-50 border border-green-100'
                  }`}>
                    <p className={`text-xs mb-0.5 ${status.overdue ? 'text-red-500' : 'text-green-500'}`}>
                      {status.overdue ? 'RETARD' : 'RESTANT'}
                    </p>
                    <p className={`font-bold text-sm ${status.overdue ? 'text-red-700' : 'text-green-700'}`}>
                      {status.label}
                    </p>
                  </div>
                </div>
              </div>
            )
          } else {
            return (
              <div key={jet.id} className="bg-white rounded-2xl border-2 border-green-200 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-xl">
                      🚤
                    </div>
                    <div>
                      <p className="font-bold text-gray-800">{jet.name}</p>
                      <p className="text-gray-400 text-xs">{jet.type}</p>
                    </div>
                  </div>
                  <span className="bg-green-100 text-green-700 text-sm font-bold px-4 py-1.5 rounded-full">
                    🟢 Disponible
                  </span>
                </div>
              </div>
            )
          }
        })}
      </div>

      {/* Note actualisation */}
      <p className="text-center text-gray-300 text-xs mt-6">
        🔄 Actualisation automatique toutes les 30 secondes
      </p>
    </div>
  )
}
