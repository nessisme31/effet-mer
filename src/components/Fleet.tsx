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

const timeStatus = (endTime: string) => {
  const diff = Math.floor((new Date(endTime).getTime() - Date.now()) / 60000)
  if (diff > 0) return { label: `${diff} min`, overdue: false }
  return { label: `+${Math.abs(diff)} min`, overdue: true }
}

export default function Fleet() {
  const [rentalMap, setRentalMap] = useState<Record<string, ActiveRental>>({})
  const [loading, setLoading] = useState(true)
  const [, setTick] = useState(0)

  const fetchActive = useCallback(async () => {
    const { data } = await supabase
      .from('rentals')
      .select('id, jet_ski_id, client_firstname, client_name, activity_name, activity_subtype, start_time, end_time, duration, cart_items')
      .eq('status', 'active')
      .not('jet_ski_id', 'is', null)

    const map: Record<string, ActiveRental> = {}
    data?.forEach(r => {
      if (r.jet_ski_id) {
        const ids = r.jet_ski_id.split(',').map((s: string) => s.trim()).filter(Boolean)
        ids.forEach((id: string) => {
          const item = r.cart_items?.find(
            (ci: { assignedJetSkiId?: string; itemStatus?: string }) =>
              ci.assignedJetSkiId === id && ci.itemStatus !== 'returned'
          )
          map[id] = item ? {
            ...r,
            start_time:       item.itemStartTime  || r.start_time,
            end_time:         item.itemEndTime    || r.end_time,
            activity_name:    item.activity?.name ?? r.activity_name,
            activity_subtype: item.subtype        ?? r.activity_subtype,
            duration:         item.activity?.duration ?? r.duration,
          } : r
        })
      }
    })
    setRentalMap(map)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchActive()
    const dataInterval = setInterval(fetchActive, 30000)
    const tickInterval = setInterval(() => setTick(t => t + 1), 60000)
    return () => { clearInterval(dataInterval); clearInterval(tickInterval) }
  }, [fetchActive])

  const availableCount = CONFIG.jetSkis.filter(j => !rentalMap[j.id]).length
  const occupiedCount  = CONFIG.jetSkis.filter(j =>  !!rentalMap[j.id]).length

  if (loading) return <div className="text-center py-16 text-gray-400">⏳ Chargement...</div>

  const occupiedJets  = CONFIG.jetSkis.filter(j => !!rentalMap[j.id])
  const availableJets = CONFIG.jetSkis.filter(j => !rentalMap[j.id])

  const JetIcon = ({ type = 'FX', className = 'h-5 w-5' }: { type?: string; className?: string }) => (
    <img
      src={type === 'VX' ? '/jetski_icon_VX.webp' : '/jetski_icon_FX.webp'}
      alt=""
      className={`inline object-contain ${className}`}
    />
  )

  return (
    <div className="h-full flex flex-col">

      {/* Header compact */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><JetIcon className="h-6 w-6" /> Ma Flotte</h2>
          <p className="text-gray-400 text-xs">Temps réel · auto 30s</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-green-100 text-green-700 text-sm font-bold px-3 py-1 rounded-full">
            🟢 {availableCount} dispo
          </span>
          <span className="bg-red-100 text-red-700 text-sm font-bold px-3 py-1 rounded-full">
            🔴 {occupiedCount} en mer
          </span>
          <button onClick={() => { setLoading(true); fetchActive() }}
            className="text-blue-600 hover:text-blue-800 border border-blue-200 px-2.5 py-1 rounded-lg text-xs font-medium hover:bg-blue-50">
            🔄
          </button>
        </div>
      </div>

      {/* Jets EN MER */}
      {occupiedJets.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">En mer ({occupiedJets.length})</p>
          <div className="grid grid-cols-2 gap-2">
            {occupiedJets.map(jet => {
              const rental = rentalMap[jet.id]!
              const status = timeStatus(rental.end_time)
              return (
                <div key={jet.id} className={`rounded-xl border-2 p-3 ${
                  status.overdue ? 'bg-red-50 border-red-300' : 'bg-white border-orange-200'
                }`}>
                  {/* Ligne 1 : nom jet + badge temps */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <JetIcon type={jet.type} className="h-5 w-5" />
                      <span className="font-bold text-gray-800">{jet.name}</span>
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      status.overdue ? 'bg-red-200 text-red-800' : 'bg-orange-100 text-orange-700'
                    }`}>
                      {status.overdue ? `⚠️ ${status.label}` : `⏳ ${status.label}`}
                    </span>
                  </div>

                  {/* Ligne 2 : client */}
                  <p className="text-sm font-semibold text-gray-800 truncate">
                    {rental.client_firstname} {rental.client_name}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {rental.activity_name}{rental.activity_subtype ? ` · ${rental.activity_subtype}` : ''} · {rental.duration}
                  </p>

                  {/* Ligne 3 : horaires */}
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex-1 bg-gray-50 rounded-lg px-2 py-1 text-center">
                      <p className="text-gray-400 text-[10px]">DÉPART</p>
                      <p className="font-bold text-gray-700 text-xs">{fmt(rental.start_time)}</p>
                    </div>
                    <div className={`flex-1 rounded-lg px-2 py-1 text-center ${
                      status.overdue ? 'bg-red-100' : 'bg-green-50'
                    }`}>
                      <p className={`text-[10px] ${status.overdue ? 'text-red-400' : 'text-green-400'}`}>RETOUR</p>
                      <p className={`font-bold text-xs ${status.overdue ? 'text-red-700' : 'text-green-700'}`}>
                        {fmt(rental.end_time)}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Jets DISPONIBLES */}
      {availableJets.length > 0 && (
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Disponibles ({availableJets.length})</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {availableJets.map(jet => (
              <div key={jet.id} className="bg-white rounded-xl border-2 border-green-200 px-3 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <JetIcon type={jet.type} className="h-4 w-4" />
                  <span className="font-bold text-gray-800 text-sm">{jet.name}</span>
                  <span className="text-gray-400 text-xs">{jet.type}</span>
                </div>
                <span className="text-green-600 text-xs font-bold">🟢</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tout dispo */}
      {occupiedCount === 0 && (
        <p className="text-center text-gray-400 text-sm mt-3 font-medium">Tous les jets sont disponibles</p>
      )}

      <p className="text-center text-gray-300 text-xs mt-3">🔄 Auto toutes les 30 secondes</p>
    </div>
  )
}
