import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { CONFIG } from '../config'
import { Rental } from '../types'

export default function Analytics() {
  const [rentals, setRentals] = useState<Rental[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('rentals')
        .select('*')
        .order('created_at', { ascending: false })
      setRentals(data || [])
      setLoading(false)
    }
    fetch()
  }, [])

  const now = new Date()
  const today = now.toISOString().slice(0, 10)
  const thisMonth = now.toISOString().slice(0, 7)

  const todayRentals  = rentals.filter(r => r.created_at.startsWith(today))
  const monthRentals  = rentals.filter(r => r.created_at.startsWith(thisMonth))
  const activeRentals = rentals.filter(r => r.status === 'active')

  const caToday = todayRentals.reduce((s, r) => s + r.price, 0)
  const caMonth = monthRentals.reduce((s, r) => s + r.price, 0)
  const caTotal = rentals.reduce((s, r) => s + r.price, 0)

  // Activity stats
  const activityMap = rentals.reduce((acc, r) => {
    acc[r.activity_name] = acc[r.activity_name] || { count: 0, ca: 0 }
    acc[r.activity_name].count++
    acc[r.activity_name].ca += r.price
    return acc
  }, {} as Record<string, { count: number; ca: number }>)

  const sortedActivities = Object.entries(activityMap).sort((a, b) => b[1].ca - a[1].ca)
  const topActivity = sortedActivities[0]

  // Jet ski usage
  const jetMap = rentals
    .filter(r => r.jet_ski_id)
    .reduce((acc, r) => {
      acc[r.jet_ski_id!] = (acc[r.jet_ski_id!] || 0) + 1
      return acc
    }, {} as Record<string, number>)

  // Payment method stats
  const payMap = rentals.reduce((acc, r) => {
    acc[r.payment_method] = (acc[r.payment_method] || 0) + r.price
    return acc
  }, {} as Record<string, number>)

  if (loading) return <div className="text-center py-16 text-gray-400">⏳ Chargement...</div>

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Tableau de bord</h2>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-blue-700 text-white rounded-2xl p-4 shadow">
          <p className="text-blue-200 text-xs font-medium mb-1">CA AUJOURD'HUI</p>
          <p className="text-2xl font-bold">{caToday.toLocaleString()}</p>
          <p className="text-blue-200 text-xs">{CONFIG.currency} · {todayRentals.length} location(s)</p>
        </div>
        <div className="bg-blue-500 text-white rounded-2xl p-4 shadow">
          <p className="text-blue-100 text-xs font-medium mb-1">CA CE MOIS</p>
          <p className="text-2xl font-bold">{caMonth.toLocaleString()}</p>
          <p className="text-blue-100 text-xs">{CONFIG.currency} · {monthRentals.length} location(s)</p>
        </div>
        <div className="bg-green-600 text-white rounded-2xl p-4 shadow">
          <p className="text-green-100 text-xs font-medium mb-1">CA TOTAL</p>
          <p className="text-2xl font-bold">{caTotal.toLocaleString()}</p>
          <p className="text-green-100 text-xs">{CONFIG.currency} · {rentals.length} location(s)</p>
        </div>
        <div className="bg-orange-500 text-white rounded-2xl p-4 shadow">
          <p className="text-orange-100 text-xs font-medium mb-1">EN COURS</p>
          <p className="text-2xl font-bold">{activeRentals.length}</p>
          <p className="text-orange-100 text-xs">
            {topActivity ? `⭐ ${topActivity[0]}` : 'Aucune location active'}
          </p>
        </div>
      </div>

      {/* CA by activity */}
      <div className="bg-white rounded-2xl border p-5 mb-4 shadow-sm">
        <h3 className="font-bold text-gray-800 mb-4">📊 CA par activité</h3>
        {sortedActivities.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-4">Pas encore de données</p>
        ) : (
          <div className="space-y-3">
            {sortedActivities.map(([activity, stats]) => {
              const pct = caTotal > 0 ? (stats.ca / caTotal * 100) : 0
              return (
                <div key={activity}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700 font-medium">{activity}</span>
                    <div className="text-right">
                      <span className="font-bold text-gray-800">{stats.ca.toLocaleString()} {CONFIG.currency}</span>
                      <span className="text-gray-400 ml-2 text-xs">({stats.count}x)</span>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-2 bg-blue-500 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Jet ski usage */}
      <div className="bg-white rounded-2xl border p-5 mb-4 shadow-sm">
        <h3 className="font-bold text-gray-800 mb-4">🚤 Utilisation des jets skis</h3>
        <div className="grid grid-cols-4 gap-2">
          {CONFIG.jetSkis.map(jet => (
            <div
              key={jet.id}
              className={`text-center p-3 rounded-xl ${
                (jetMap[jet.id] || 0) > 0 ? 'bg-blue-50' : 'bg-gray-50'
              }`}
            >
              <div className="text-2xl mb-1">🚤</div>
              <div className="font-bold text-gray-800 text-sm">{jet.name}</div>
              <div className={`font-bold text-lg ${
                (jetMap[jet.id] || 0) > 0 ? 'text-blue-600' : 'text-gray-400'
              }`}>
                {jetMap[jet.id] || 0}
              </div>
              <div className="text-gray-400 text-xs">sortie(s)</div>
            </div>
          ))}
        </div>
      </div>

      {/* Payment methods */}
      <div className="bg-white rounded-2xl border p-5 shadow-sm">
        <h3 className="font-bold text-gray-800 mb-4">💳 CA par mode de paiement</h3>
        <div className="space-y-2">
          {CONFIG.paymentMethods.map(method => {
            const amount = payMap[method] || 0
            const pct = caTotal > 0 ? (amount / caTotal * 100) : 0
            const icons: Record<string, string> = { 'Espèces': '💵', 'Carte bancaire': '💳', 'Virement': '🏦' }
            return (
              <div key={method} className="flex items-center gap-3">
                <span className="text-xl w-8">{icons[method]}</span>
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700">{method}</span>
                    <span className="font-medium">{amount.toLocaleString()} {CONFIG.currency}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full">
                    <div className="h-1.5 bg-green-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
