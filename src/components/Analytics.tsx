import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { CONFIG } from '../config'
import { Rental, CartItem } from '../types'

// ── Couleurs du camembert ──────────────────────────────────
const PIE_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
  '#f97316', '#6366f1', '#14b8a6', '#e11d48',
]

// ── Composant Camembert SVG (donut) ───────────────────────
interface PieSlice { label: string; value: number; count: number }

function PieChart({ data }: { data: PieSlice[] }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  if (total === 0) return null

  const SIZE = 200
  const cx = SIZE / 2
  const cy = SIZE / 2
  const R = 80   // rayon externe
  const r = 46   // rayon interne (trou du donut)

  let angle = -90  // partir du haut

  const slices = data.map((d, i) => {
    const pct   = d.value / total
    const sweep = pct * 360
    const start = angle
    const end   = angle + sweep
    angle       = end

    const s = (a: number) => (a * Math.PI) / 180
    const x1 = cx + R * Math.cos(s(start)), y1 = cy + R * Math.sin(s(start))
    const x2 = cx + R * Math.cos(s(end)),   y2 = cy + R * Math.sin(s(end))
    const xi1 = cx + r * Math.cos(s(start)), yi1 = cy + r * Math.sin(s(start))
    const xi2 = cx + r * Math.cos(s(end)),   yi2 = cy + r * Math.sin(s(end))
    const large = sweep > 180 ? 1 : 0

    return {
      d: `M${x1},${y1} A${R},${R} 0 ${large},1 ${x2},${y2} L${xi2},${yi2} A${r},${r} 0 ${large},0 ${xi1},${yi1} Z`,
      color: PIE_COLORS[i % PIE_COLORS.length],
      label: d.label,
    }
  })

  return (
    <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
      {slices.map((s, i) => (
        <path key={i} d={s.d} fill={s.color} stroke="white" strokeWidth="2" />
      ))}
      {/* Centre */}
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize="16" fontWeight="bold" fill="#1f2937">
        {data.length}
      </text>
      <text x={cx} y={cy + 10} textAnchor="middle" fontSize="10" fill="#6b7280">
        activités
      </text>
    </svg>
  )
}

interface ParkingEntry {
  id: string
  type: string
  price: number
  client_name: string
  payment_method: string
  status: string
  created_at: string
  start_time?: string
}

type AffluenceView = 'heure' | 'jour' | 'mois'

const MOIS_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']
const MOIS_FR_LONG = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
const HOURS = [11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21]

interface LateFee {
  id: string
  created_at: string
  amount: number
  comment: string | null
  rental_id: string | null
  payment_method: string | null
}

export default function Analytics() {
  const [rentals, setRentals] = useState<Rental[]>([])
  const [parkings, setParkings] = useState<ParkingEntry[]>([])
  const [lateFees, setLateFees] = useState<LateFee[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  // Affluence state
  const [affluenceView, setAffluenceView] = useState<AffluenceView>('heure')
  const now = new Date()
  const [selectedDate, setSelectedDate] = useState(now.toISOString().slice(0, 10))
  const [selectedMonth, setSelectedMonth] = useState(now.toISOString().slice(0, 7))
  const [selectedYear, setSelectedYear] = useState(String(now.getFullYear()))

  // Paiement : filtre par jour (défaut = aujourd'hui)
  const [payDate, setPayDate] = useState(now.toISOString().slice(0, 10))

  useEffect(() => {
    const fetchAll = async () => {
      const [rentalsRes, parkingsRes, lateFeesRes] = await Promise.all([
        supabase.from('rentals').select('*').order('created_at', { ascending: false }),
        supabase.from('parkings').select('*').order('created_at', { ascending: false }),
        supabase.from('late_fees').select('*').order('created_at', { ascending: false }),
      ])
      setRentals(rentalsRes.data || [])
      setParkings(parkingsRes.data || [])
      setLateFees(lateFeesRes.data || [])
      setLoading(false)
    }
    fetchAll()
  }, [refreshKey])

  // ── KPI : locations + parkings ─────────────────────────────
  const today     = now.toISOString().slice(0, 10)
  const thisMonth = now.toISOString().slice(0, 7)

  const todayRentals  = rentals.filter(r => r.created_at.startsWith(today))
  const monthRentals  = rentals.filter(r => r.created_at.startsWith(thisMonth))
  const activeRentals = rentals.filter(r => r.status === 'active')

  const todayParkings  = parkings.filter(p => p.created_at.startsWith(today))
  const monthParkings  = parkings.filter(p => p.created_at.startsWith(thisMonth))

  // ── Frais de retard ────────────────────────────────────────
  const todayLate  = lateFees.filter(lf => lf.created_at.startsWith(today))
  const monthLate  = lateFees.filter(lf => lf.created_at.startsWith(thisMonth))

  const caToday = todayRentals.reduce((s, r) => s + r.price, 0)
              + todayParkings.reduce((s, p) => s + p.price, 0)
              + todayLate.reduce((s, lf) => s + lf.amount, 0)
  const caMonth = monthRentals.reduce((s, r) => s + r.price, 0)
              + monthParkings.reduce((s, p) => s + p.price, 0)
              + monthLate.reduce((s, lf) => s + lf.amount, 0)
  const caRentalsTotal  = rentals.reduce((s, r) => s + r.price, 0)
  const caParkingsTotal = parkings.reduce((s, p) => s + p.price, 0)
  const caLateTotal     = lateFees.reduce((s, lf) => s + lf.amount, 0)
  const caTotal = caRentalsTotal + caParkingsTotal + caLateTotal

  const todayCount  = todayRentals.length + todayParkings.length
  const monthCount  = monthRentals.length + monthParkings.length

  // ── Activités : décomposition individuelle via cart_items ─
  const activityMap = rentals.reduce((acc, r) => {
    if (r.cart_items && Array.isArray(r.cart_items) && r.cart_items.length > 0) {
      // Rentals multi-panier → chaque item individuellement
      r.cart_items.forEach((item: CartItem) => {
        const key = item.activity.name + (item.subtype ? ` — ${item.subtype}` : '')
        acc[key] = acc[key] || { count: 0, ca: 0 }
        acc[key].count++
        acc[key].ca += item.itemPrice
      })
    } else {
      // Anciens rentals (sans cart_items) → activité simple
      const key = r.activity_name + (r.activity_subtype ? ` — ${r.activity_subtype}` : '')
      acc[key] = acc[key] || { count: 0, ca: 0 }
      acc[key].count++
      acc[key].ca += r.price
    }
    return acc
  }, {} as Record<string, { count: number; ca: number }>)

  // ── Parkings dans le CA par activité ──────────────────────
  const parkingMap = parkings.reduce((acc, p) => {
    acc[p.type] = acc[p.type] || { count: 0, ca: 0 }
    acc[p.type].count++
    acc[p.type].ca += p.price
    return acc
  }, {} as Record<string, { count: number; ca: number }>)

  // Fusionner locations + parkings + retards dans un seul tableau
  const allActivityMap = { ...activityMap }
  Object.entries(parkingMap).forEach(([key, val]) => {
    allActivityMap[`🅿️ ${key}`] = val
  })
  // Ajouter les frais de retard comme catégorie "⏰ Retard"
  if (caLateTotal > 0) {
    allActivityMap['⏰ Retard'] = { count: lateFees.length, ca: caLateTotal }
  }

  const sortedActivities = Object.entries(allActivityMap).sort((a, b) => b[1].ca - a[1].ca)
  const topActivity = Object.entries(activityMap).sort((a, b) => b[1].ca - a[1].ca)[0]

  // ── Jet skis : sorties + heures totales ───────────────────
  // Fallback sur cart_items.assignedJetSkiId si jet_ski_id est null (bug ancien code)
  const jetMap = rentals.reduce((acc, r) => {
    let jetIds: string[] = []
    if (r.jet_ski_id) {
      jetIds = r.jet_ski_id.split(',').map((s: string) => s.trim()).filter(Boolean)
    } else if (r.cart_items && Array.isArray(r.cart_items)) {
      jetIds = (r.cart_items as CartItem[])
        .filter(item => item.assignedJetSkiId)
        .map(item => item.assignedJetSkiId!)
    }
    if (jetIds.length === 0) return acc
    const mins = (r.start_time && r.end_time)
      ? Math.max(0, (new Date(r.end_time).getTime() - new Date(r.start_time).getTime()) / 60000)
      : 0
    jetIds.forEach(id => {
      if (!acc[id]) acc[id] = { count: 0, minutes: 0 }
      acc[id].count++
      acc[id].minutes += mins
    })
    return acc
  }, {} as Record<string, { count: number; minutes: number }>)

  const fmtHours = (minutes: number) => {
    const h = Math.floor(minutes / 60)
    const m = Math.round(minutes % 60)
    if (h === 0) return `${m} min`
    if (m === 0) return `${h}h00`
    return `${h}h${String(m).padStart(2, '0')}`
  }

  // ── Paiements : filtré par jour sélectionné ───────────────
  const payDayRentals  = rentals.filter(r => r.created_at.startsWith(payDate))
  const payDayParkings = parkings.filter(p => p.created_at.startsWith(payDate))
  const payDayLate     = lateFees.filter(lf => lf.created_at.startsWith(payDate) && lf.payment_method)
  const payMap: Record<string, number> = {}
  payDayRentals.forEach(r  => { payMap[r.payment_method] = (payMap[r.payment_method] || 0) + r.price })
  payDayParkings.forEach(p => { payMap[p.payment_method] = (payMap[p.payment_method] || 0) + p.price })
  payDayLate.forEach(lf    => { payMap[lf.payment_method!] = (payMap[lf.payment_method!] || 0) + lf.amount })
  const payDayTotal = payDayRentals.reduce((s, r) => s + r.price, 0)
                    + payDayParkings.reduce((s, p) => s + p.price, 0)
                    + payDayLate.reduce((s, lf) => s + lf.amount, 0)

  // ── Heures les plus rentables (toutes données historiques) ──
  const hourlyProfit = Array.from({ length: 24 }, (_, h) => {
    const hourRentals = rentals.filter(r => r.start_time && new Date(r.start_time).getHours() === h)
    if (hourRentals.length === 0) return null
    const totalCA      = hourRentals.reduce((s, r) => s + r.price, 0)
    const distinctDays = new Set(hourRentals.map(r => r.start_time.slice(0, 10))).size
    const avgCA        = Math.round(totalCA / distinctDays)
    return { h, label: `${h}h00`, totalCA, avgCA, count: hourRentals.length, distinctDays }
  })
    .filter(Boolean)
    .sort((a, b) => b!.avgCA - a!.avgCA) as {
      h: number; label: string; totalCA: number
      avgCA: number; count: number; distinctDays: number
    }[]

  const maxAvgCA = hourlyProfit[0]?.avgCA ?? 1

  // ── Affluence : Vue HEURE ─────────────────────────────────
  const hourData = HOURS.map(h => {
    const rentalCount = rentals.filter(r => {
      if (!r.start_time) return false
      const d = new Date(r.start_time)
      return r.start_time.startsWith(selectedDate) && d.getHours() === h
    }).length
    const parkingCount = parkings.filter(p => {
      const d = new Date(p.created_at)
      return p.created_at.startsWith(selectedDate) && d.getHours() === h
    }).length
    return { label: `${h}h`, count: rentalCount + parkingCount }
  })

  // ── Affluence : Vue JOUR ──────────────────────────────────
  const [selYear, selMonthNum] = selectedMonth.split('-').map(Number)
  const daysInMonth = new Date(selYear, selMonthNum, 0).getDate()
  const dayData = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1
    const dayStr = `${selectedMonth}-${String(day).padStart(2, '0')}`
    const rentalCount = rentals.filter(r => r.start_time && r.start_time.startsWith(dayStr)).length
    const parkingCount = parkings.filter(p => p.created_at.startsWith(dayStr)).length
    return { label: String(day), count: rentalCount + parkingCount }
  })

  // ── Affluence : Vue MOIS ──────────────────────────────────
  const monthData = MOIS_FR.map((label, idx) => {
    const monthStr = `${selectedYear}-${String(idx + 1).padStart(2, '0')}`
    const rentalCount = rentals.filter(r => r.start_time && r.start_time.startsWith(monthStr)).length
    const parkingCount = parkings.filter(p => p.created_at.startsWith(monthStr)).length
    return { label, count: rentalCount + parkingCount }
  })

  const currentData = affluenceView === 'heure' ? hourData : affluenceView === 'jour' ? dayData : monthData
  const maxCount = Math.max(...currentData.map(d => d.count), 1)

  const barColor = (count: number) => {
    const ratio = count / maxCount
    if (ratio === 0) return 'bg-gray-100'
    if (ratio < 0.33) return 'bg-blue-200'
    if (ratio < 0.66) return 'bg-blue-400'
    return 'bg-blue-600'
  }

  if (loading) return <div className="text-center py-16 text-gray-400">⏳ Chargement...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Tableau de bord</h2>
        <button
          onClick={() => { setLoading(true); setRefreshKey(k => k + 1) }}
          className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
        >
          🔄 Rafraîchir
        </button>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-blue-700 text-white rounded-2xl p-4 shadow">
          <p className="text-blue-200 text-xs font-medium mb-1">CA AUJOURD'HUI</p>
          <p className="text-2xl font-bold">{caToday.toLocaleString()}</p>
          <p className="text-blue-200 text-xs">{CONFIG.currency} · {todayCount} opération(s)</p>
        </div>
        <div className="bg-blue-500 text-white rounded-2xl p-4 shadow">
          <p className="text-blue-100 text-xs font-medium mb-1">CA CE MOIS</p>
          <p className="text-2xl font-bold">{caMonth.toLocaleString()}</p>
          <p className="text-blue-100 text-xs">{CONFIG.currency} · {monthCount} opération(s)</p>
        </div>
        <div className="bg-green-600 text-white rounded-2xl p-4 shadow">
          <p className="text-green-100 text-xs font-medium mb-1">CA TOTAL</p>
          <p className="text-2xl font-bold">{caTotal.toLocaleString()}</p>
          <p className="text-green-100 text-xs">{CONFIG.currency} · dont {caParkingsTotal.toLocaleString()} parking</p>
        </div>
        <div className="bg-orange-500 text-white rounded-2xl p-4 shadow">
          <p className="text-orange-100 text-xs font-medium mb-1">EN COURS</p>
          <p className="text-2xl font-bold">{activeRentals.length}</p>
          <p className="text-orange-100 text-xs">
            {topActivity ? `⭐ ${topActivity[0]}` : 'Aucune location active'}
          </p>
        </div>
      </div>

      {/* ── CA par activité (camembert + liste) ── */}
      <div className="bg-white rounded-2xl border p-5 mb-4 shadow-sm">
        <h3 className="font-bold text-gray-800 mb-4">📊 CA par activité</h3>
        {sortedActivities.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-4">Pas encore de données</p>
        ) : (
          <>
            {/* Camembert + légende */}
            <div className="flex flex-col items-center mb-5">
              <PieChart
                data={sortedActivities.map(([label, stats]) => ({
                  label,
                  value: stats.ca,
                  count: stats.count,
                }))}
              />
              {/* Légende couleurs */}
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 justify-center">
                {sortedActivities.map(([activity], i) => (
                  <div key={activity} className="flex items-center gap-1.5">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                    />
                    <span className="text-xs text-gray-600 max-w-[140px] truncate">{activity}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Liste détaillée */}
            <div className="space-y-3">
              {sortedActivities.map(([activity, stats], i) => {
                const pct = caTotal > 0 ? (stats.ca / caTotal * 100) : 0
                const isParking = activity.startsWith('🅿️')
                return (
                  <div key={activity}>
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                        />
                        <span className={`font-medium text-sm truncate ${isParking ? 'text-indigo-700' : 'text-gray-700'}`}>
                          {activity}
                        </span>
                      </div>
                      <span className="font-bold text-gray-800 ml-2 flex-shrink-0">
                        {stats.ca.toLocaleString()} {CONFIG.currency}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        isParking ? 'bg-indigo-50 text-indigo-700' : 'bg-blue-50 text-blue-700'
                      }`}>
                        🔁 {stats.count} fois
                      </span>
                      <span className="text-gray-400 text-xs">{pct.toFixed(1)}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-1.5 rounded-full"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: PIE_COLORS[i % PIE_COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* ── Affluence ── */}
      <div className="bg-white rounded-2xl border p-5 mb-4 shadow-sm">
        <h3 className="font-bold text-gray-800 mb-4">📈 Affluence</h3>

        <div className="flex gap-2 mb-4">
          {(['heure', 'jour', 'mois'] as AffluenceView[]).map(v => (
            <button
              key={v}
              onClick={() => setAffluenceView(v)}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${
                affluenceView === v
                  ? 'bg-blue-700 text-white shadow'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {v === 'heure' ? '⏰ Par heure' : v === 'jour' ? '📅 Par jour' : '📆 Par mois'}
            </button>
          ))}
        </div>

        <div className="mb-5">
          {affluenceView === 'heure' && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 flex-shrink-0">Jour :</span>
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="border border-gray-300 rounded-xl px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-xs text-gray-400">
                {new Date(selectedDate).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </span>
            </div>
          )}
          {affluenceView === 'jour' && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 flex-shrink-0">Mois :</span>
              <input
                type="month"
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                className="border border-gray-300 rounded-xl px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-xs text-gray-400">
                {MOIS_FR_LONG[Number(selectedMonth.split('-')[1]) - 1]} {selectedMonth.split('-')[0]}
              </span>
            </div>
          )}
          {affluenceView === 'mois' && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 flex-shrink-0">Année :</span>
              <select
                value={selectedYear}
                onChange={e => setSelectedYear(e.target.value)}
                className="border border-gray-300 rounded-xl px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              >
                {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {currentData.every(d => d.count === 0) ? (
          <div className="text-center py-8 text-gray-400">
            <div className="text-4xl mb-2">📭</div>
            <p className="text-sm">Aucune opération sur cette période</p>
          </div>
        ) : (
          <>
            <div
              className="flex items-end h-40"
              style={{ gap: affluenceView === 'jour' ? '2px' : '6px' }}
            >
              {currentData.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
                  {d.count > 0 && (
                    <span className="text-xs font-bold text-blue-700 mb-1">{d.count}</span>
                  )}
                  <div
                    className={`w-full rounded-t-md transition-all ${barColor(d.count)}`}
                    style={{ height: `${(d.count / maxCount) * 100}%`, minHeight: d.count > 0 ? '4px' : '2px' }}
                  />
                </div>
              ))}
            </div>
            <div
              className="flex mt-1"
              style={{ gap: affluenceView === 'jour' ? '2px' : '6px' }}
            >
              {currentData.map((d, i) => (
                <div key={i} className="flex-1 text-center">
                  <span className={`text-gray-500 font-medium ${affluenceView === 'jour' ? 'text-[9px]' : 'text-xs'}`}>
                    {d.label}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-blue-200" />
                <span className="text-xs text-gray-500">Peu chargé</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-blue-400" />
                <span className="text-xs text-gray-500">Modéré</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-blue-600" />
                <span className="text-xs text-gray-500">Très chargé</span>
              </div>
              <span className="text-xs text-gray-400 ml-auto">
                Total : {currentData.reduce((s, d) => s + d.count, 0)} opération(s)
              </span>
            </div>
          </>
        )}
      </div>

      {/* ── Utilisation jets skis ── */}
      <div className="bg-white rounded-2xl border p-5 mb-4 shadow-sm">
        <h3 className="font-bold text-gray-800 mb-4">🚤 Utilisation des jets skis</h3>
        <div className="grid grid-cols-4 gap-2">
          {CONFIG.jetSkis.map(jet => {
            const stats = jetMap[jet.id] || { count: 0, minutes: 0 }
            return (
              <div
                key={jet.id}
                className={`text-center p-3 rounded-xl ${stats.count > 0 ? 'bg-blue-50' : 'bg-gray-50'}`}
              >
                <div className="text-2xl mb-1">🚤</div>
                <div className="font-bold text-gray-800 text-sm">{jet.name}</div>
                <div className={`font-bold text-lg ${stats.count > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                  {stats.count}
                </div>
                <div className="text-gray-400 text-xs">sortie(s)</div>
                {stats.minutes > 0 && (
                  <div className="text-blue-500 text-xs font-semibold mt-1">
                    ⏱️ {fmtHours(stats.minutes)}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Paiements ── */}
      <div className="bg-white rounded-2xl border p-5 shadow-sm">
        <h3 className="font-bold text-gray-800 mb-3">💳 CA par mode de paiement</h3>

        {/* Sélecteur de date */}
        <div className="flex items-center gap-2 mb-4">
          <input
            type="date"
            value={payDate}
            onChange={e => setPayDate(e.target.value)}
            className="border border-gray-300 rounded-xl px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-green-500"
          />
          <button
            onClick={() => setPayDate(now.toISOString().slice(0, 10))}
            className="text-xs text-blue-600 hover:text-blue-800 font-semibold px-2 py-1 bg-blue-50 rounded-lg"
          >
            Aujourd'hui
          </button>
          <span className="ml-auto text-xs text-gray-400">
            {new Date(payDate + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </span>
        </div>

        {/* Total du jour */}
        <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-2.5 mb-4 flex justify-between items-center">
          <span className="text-green-700 text-sm font-medium">
            Total du jour · {payDayRentals.length + payDayParkings.length} opération(s)
          </span>
          <span className="text-green-800 font-bold text-lg">{payDayTotal.toLocaleString()} {CONFIG.currency}</span>
        </div>

        {payDayTotal === 0 ? (
          <div className="text-center py-6 text-gray-400">
            <div className="text-3xl mb-2">📭</div>
            <p className="text-sm">Aucune opération ce jour-là</p>
          </div>
        ) : (
          <div className="space-y-3">
            {CONFIG.paymentMethods.map(method => {
              const amount = payMap[method] || 0
              const pct = payDayTotal > 0 ? (amount / payDayTotal * 100) : 0
              const icons: Record<string, string> = { 'Espèces': '💵', 'Carte bancaire': '💳', 'Virement': '🏦' }
              if (amount === 0) return null
              return (
                <div key={method} className="flex items-center gap-3">
                  <span className="text-xl w-8">{icons[method] || '💰'}</span>
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700 font-medium">{method}</span>
                      <div className="text-right">
                        <span className="font-bold text-gray-800">{amount.toLocaleString()} {CONFIG.currency}</span>
                        <span className="text-gray-400 text-xs ml-2">{pct.toFixed(0)}%</span>
                      </div>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-2 bg-green-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Heures les plus rentables ── */}
      <div className="bg-white rounded-2xl border p-5 shadow-sm mt-6">
        <h3 className="font-bold text-gray-800 mb-1">⏰ Heures les plus rentables</h3>
        <p className="text-xs text-gray-400 mb-4">CA moyen par heure de départ · toutes les données historiques</p>

        {hourlyProfit.length === 0 ? (
          <div className="text-center py-6 text-gray-400 text-sm">Pas encore assez de données</div>
        ) : (
          <div className="space-y-3">
            {hourlyProfit.slice(0, 8).map((d, idx) => {
              const pct = Math.round((d.avgCA / maxAvgCA) * 100)
              const medals = ['🥇', '🥈', '🥉']
              const medal = medals[idx] ?? `#${idx + 1}`
              const barColor =
                idx === 0 ? 'bg-yellow-400' :
                idx === 1 ? 'bg-gray-400' :
                idx === 2 ? 'bg-amber-600' :
                'bg-blue-400'
              return (
                <div key={d.h} className="flex items-center gap-3">
                  <span className="text-lg w-8 text-center flex-shrink-0">{medal}</span>
                  <div className="w-12 text-center flex-shrink-0">
                    <span className="font-bold text-gray-700 text-sm">{d.label}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-500">{d.count} sortie{d.count > 1 ? 's' : ''} · {d.distinctDays} jour{d.distinctDays > 1 ? 's' : ''}</span>
                      <div className="text-right">
                        <span className="font-bold text-gray-800">{d.avgCA.toLocaleString()} {CONFIG.currency}</span>
                        <span className="text-gray-400 text-xs ml-1">/jour</span>
                      </div>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-2 ${barColor} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {hourlyProfit.length > 8 && (
          <p className="text-xs text-gray-400 text-center mt-3">
            Top 8 affiché · {hourlyProfit.length} tranches horaires analysées
          </p>
        )}
      </div>

    </div>
  )
}
