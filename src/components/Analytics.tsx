import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { CONFIG } from '../config'
import { Rental } from '../types'

// ─── Couleurs pour le camembert ───────────────────────────────
const PIE_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16', '#f97316',
]

// ─── Helpers SVG pour le camembert ──────────────────────────
const polar = (cx: number, cy: number, r: number, angle: number) => {
  const rad = (angle - 90) * (Math.PI / 180)
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

const slicePath = (cx: number, cy: number, r: number, start: number, end: number) => {
  if (end - start >= 360) end = 359.99
  const s = polar(cx, cy, r, start)
  const e = polar(cx, cy, r, end)
  const large = end - start > 180 ? 1 : 0
  return `M${cx},${cy} L${s.x.toFixed(2)},${s.y.toFixed(2)} A${r},${r} 0 ${large} 1 ${e.x.toFixed(2)},${e.y.toFixed(2)} Z`
}

// ─── Camembert ──────────────────────────────────────────────
interface PieChartProps {
  data: { label: string; value: number; color: string }[]
  total: number
  currency: string
}

function PieChart({ data, total, currency }: PieChartProps) {
  const [hovered, setHovered] = useState<number | null>(null)
  const cx = 100, cy = 100, r = 80

  let currentAngle = 0
  const slices = data.map((item, i) => {
    const pct = total > 0 ? item.value / total : 0
    const angle = pct * 360
    const start = currentAngle
    currentAngle += angle
    return { ...item, start, end: currentAngle, pct, index: i }
  })

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      {/* SVG Camembert */}
      <div className="relative flex-shrink-0">
        <svg width="200" height="200" viewBox="0 0 200 200">
          {slices.map((slice, i) => (
            <path
              key={slice.label}
              d={slicePath(cx, cy, hovered === i ? r + 6 : r, slice.start, slice.end)}
              fill={slice.color}
              opacity={hovered !== null && hovered !== i ? 0.65 : 1}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              className="transition-all cursor-pointer"
            />
          ))}
          {/* Cercle blanc au centre (donut) */}
          <circle cx={cx} cy={cy} r={38} fill="white" />
          {/* Texte central */}
          {hovered !== null ? (
            <>
              <text x={cx} y={cy - 6} textAnchor="middle" className="text-xs" fontSize="9" fill="#6b7280">
                {slices[hovered].label.length > 12
                  ? slices[hovered].label.slice(0, 11) + '…'
                  : slices[hovered].label}
              </text>
              <text x={cx} y={cy + 8} textAnchor="middle" fontSize="11" fontWeight="bold" fill="#1e3a8a">
                {(slices[hovered].pct * 100).toFixed(1)}%
              </text>
            </>
          ) : (
            <>
              <text x={cx} y={cy - 4} textAnchor="middle" fontSize="8" fill="#9ca3af">Total</text>
              <text x={cx} y={cy + 8} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#1f2937">
                {total.toLocaleString()}
              </text>
              <text x={cx} y={cy + 20} textAnchor="middle" fontSize="8" fill="#6b7280">{currency}</text>
            </>
          )}
        </svg>
      </div>

      {/* Légende */}
      <div className="flex-1 space-y-2 w-full">
        {slices.map((slice, i) => (
          <div
            key={slice.label}
            className={`flex items-center justify-between gap-2 p-2 rounded-xl transition-all cursor-default ${
              hovered === i ? 'bg-gray-100' : ''
            }`}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: slice.color }} />
              <span className="text-sm text-gray-700 truncate">{slice.label}</span>
            </div>
            <div className="text-right flex-shrink-0">
              <span className="font-bold text-gray-800 text-sm">{slice.value.toLocaleString()} {currency}</span>
              <span className="text-gray-400 text-xs ml-1">({(slice.pct * 100).toFixed(1)}%)</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Composant principal ─────────────────────────────────────
export default function Analytics() {
  const [rentals, setRentals] = useState<Rental[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10))

  useEffect(() => {
    supabase.from('rentals').select('*').order('created_at', { ascending: false })
      .then(({ data }) => {
        setRentals(data || [])
        setLoading(false)
      })
  }, [])

  const now = new Date()
  const today = now.toISOString().slice(0, 10)
  const thisMonth = now.toISOString().slice(0, 7)

  // Filtres temporels
  const todayRentals  = rentals.filter(r => r.created_at.startsWith(today) && r.status !== 'pending_jet')
  const monthRentals  = rentals.filter(r => r.created_at.startsWith(thisMonth) && r.status !== 'pending_jet')
  const activeRentals = rentals.filter(r => r.status === 'active')
  const archivedRentals = rentals.filter(r => r.status === 'archived')

  // Recherche par jour
  const dayRentals = rentals.filter(r =>
    r.created_at.startsWith(selectedDate) && r.status !== 'pending_jet'
  )
  const dayCA = dayRentals.reduce((s, r) => s + r.price, 0)
  const dayActivityMap = dayRentals.reduce((acc, r) => {
    acc[r.activity_name] = (acc[r.activity_name] || 0) + r.price
    return acc
  }, {} as Record<string, number>)
  const dayTopActivity = Object.entries(dayActivityMap).sort((a, b) => b[1] - a[1])[0]

  // CA global
  const caToday = todayRentals.reduce((s, r) => s + r.price, 0)
  const caMonth = monthRentals.reduce((s, r) => s + r.price, 0)
  const caTotal = archivedRentals.reduce((s, r) => s + r.price, 0)

  // Statistiques par activité (sur toutes les locations archivées)
  const activityMap = archivedRentals.reduce((acc, r) => {
    acc[r.activity_name] = acc[r.activity_name] || { count: 0, ca: 0 }
    acc[r.activity_name].count++
    acc[r.activity_name].ca += r.price
    return acc
  }, {} as Record<string, { count: number; ca: number }>)

  const sortedActivities = Object.entries(activityMap).sort((a, b) => b[1].ca - a[1].ca)
  const topActivity = sortedActivities[0]

  // Camembert données
  const pieData = sortedActivities.map(([activity, stats], i) => ({
    label: activity,
    value: stats.ca,
    color: PIE_COLORS[i % PIE_COLORS.length],
  }))

  // Heures par jet ski
  const jetHoursMap = archivedRentals
    .filter(r => r.jet_ski_id && r.start_time && r.end_time)
    .reduce((acc, r) => {
      const id = r.jet_ski_id!
      const minutes = (new Date(r.end_time!).getTime() - new Date(r.start_time!).getTime()) / 60000
      acc[id] = acc[id] || { sorties: 0, minutes: 0 }
      acc[id].sorties++
      acc[id].minutes += minutes
      return acc
    }, {} as Record<string, { sorties: number; minutes: number }>)

  // Paiements
  const payMap = archivedRentals.reduce((acc, r) => {
    acc[r.payment_method] = (acc[r.payment_method] || 0) + r.price
    return acc
  }, {} as Record<string, number>)

  const formatMinutes = (minutes: number) => {
    const h = Math.floor(minutes / 60)
    const m = Math.round(minutes % 60)
    if (h === 0) return `${m} min`
    if (m === 0) return `${h}h`
    return `${h}h${String(m).padStart(2, '0')}`
  }

  if (loading) return <div className="text-center py-16 text-gray-400">⏳ Chargement...</div>

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Tableau de bord</h2>

      {/* ── KPI Cards ── */}
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
          <p className="text-green-100 text-xs">{CONFIG.currency} · {archivedRentals.length} archivée(s)</p>
        </div>
        <div className="bg-orange-500 text-white rounded-2xl p-4 shadow">
          <p className="text-orange-100 text-xs font-medium mb-1">EN COURS</p>
          <p className="text-2xl font-bold">{activeRentals.length}</p>
          <p className="text-orange-100 text-xs">
            {topActivity ? `⭐ ${topActivity[0]}` : 'Aucune location active'}
          </p>
        </div>
      </div>

      {/* ── 🔍 Recherche par jour ── */}
      <div className="bg-white rounded-2xl border p-5 mb-4 shadow-sm">
        <h3 className="font-bold text-gray-800 mb-4">🔍 Récapitulatif par jour</h3>
        <input
          type="date"
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
          className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none mb-4"
        />

        {dayRentals.length === 0 ? (
          <div className="text-center py-6 text-gray-400">
            <p className="text-3xl mb-2">📅</p>
            <p className="text-sm">Aucune location ce jour-là</p>
          </div>
        ) : (
          <>
            {/* KPIs du jour */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-blue-50 rounded-xl p-3 text-center">
                <p className="text-blue-500 text-xs font-medium mb-1">CA DU JOUR</p>
                <p className="text-xl font-bold text-blue-700">{dayCA.toLocaleString()}</p>
                <p className="text-blue-400 text-xs">{CONFIG.currency}</p>
              </div>
              <div className="bg-green-50 rounded-xl p-3 text-center">
                <p className="text-green-500 text-xs font-medium mb-1">RÉSERVATIONS</p>
                <p className="text-xl font-bold text-green-700">{dayRentals.length}</p>
                <p className="text-green-400 text-xs">location(s)</p>
              </div>
              <div className="bg-orange-50 rounded-xl p-3 text-center">
                <p className="text-orange-500 text-xs font-medium mb-1">ACTIVITÉ ⭐</p>
                <p className="text-sm font-bold text-orange-700 leading-tight mt-0.5">
                  {dayTopActivity ? dayTopActivity[0] : '—'}
                </p>
                {dayTopActivity && (
                  <p className="text-orange-400 text-xs">{dayTopActivity[1].toLocaleString()} {CONFIG.currency}</p>
                )}
              </div>
            </div>

            {/* Liste des locations du jour */}
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {dayRentals.map(rental => (
                <div key={rental.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2">
                  <div>
                    <p className="font-medium text-gray-800 text-sm">
                      {rental.client_firstname} {rental.client_name}
                    </p>
                    <p className="text-gray-500 text-xs">{rental.activity_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-blue-700 text-sm">{rental.price.toLocaleString()} {CONFIG.currency}</p>
                    <p className="text-gray-400 text-xs">{rental.payment_method}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── 🥧 CA par activité (camembert) ── */}
      <div className="bg-white rounded-2xl border p-5 mb-4 shadow-sm">
        <h3 className="font-bold text-gray-800 mb-4">🥧 CA par activité</h3>
        {pieData.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-4">Pas encore de données</p>
        ) : (
          <PieChart data={pieData} total={caTotal} currency={CONFIG.currency} />
        )}
      </div>

      {/* ── 🚤 Jets skis — sorties ET heures ── */}
      <div className="bg-white rounded-2xl border p-5 mb-4 shadow-sm">
        <h3 className="font-bold text-gray-800 mb-4">🚤 Utilisation des jets skis</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {CONFIG.jetSkis.map(jet => {
            const stats = jetHoursMap[jet.id]
            const hasActivity = stats && stats.sorties > 0
            return (
              <div
                key={jet.id}
                className={`text-center p-3 rounded-xl ${hasActivity ? 'bg-blue-50' : 'bg-gray-50'}`}
              >
                <div className="text-2xl mb-1">🚤</div>
                <div className="font-bold text-gray-800 text-sm">{jet.name}</div>
                <div className={`font-bold text-lg ${hasActivity ? 'text-blue-600' : 'text-gray-400'}`}>
                  {stats?.sorties ?? 0}
                </div>
                <div className="text-gray-400 text-xs">sortie(s)</div>
                {hasActivity && (
                  <div className="mt-1 bg-blue-100 rounded-lg px-1 py-0.5">
                    <span className="text-blue-700 text-xs font-semibold">
                      ⏱️ {formatMinutes(stats.minutes)}
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── 💳 CA par mode de paiement ── */}
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
                    <div>
                      <span className="font-medium">{amount.toLocaleString()} {CONFIG.currency}</span>
                      <span className="text-gray-400 text-xs ml-1">({pct.toFixed(1)}%)</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full">
                    <div className="h-1.5 bg-green-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
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
