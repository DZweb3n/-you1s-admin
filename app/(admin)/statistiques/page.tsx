'use client'
import { useState, useEffect } from 'react'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import Header from '@/components/Header'
import { formatPrice, ORDER_STATUSES } from '@/lib/utils'
import { createClient } from '@/lib/supabase'

type Period = 'day' | 'week' | 'month' | 'year'

export default function StatistiquesPage() {
  const [period, setPeriod] = useState<Period>('month')
  const [allOrders, setAllOrders] = useState<any[]>([])
  const [topProducts, setTopProducts] = useState<any[]>([])
  const [weeklyData, setWeeklyData] = useState<any[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    async function load() {
      const { data: orders } = await supabase.from('orders').select('total, status, created_at, items').order('created_at')
      setAllOrders(orders || [])

      // Build weekly CA (last 7 days by day name)
      const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
      const weekly: Record<string, { ca: number; cmd: number }> = {}
      dayNames.forEach(d => { weekly[d] = { ca: 0, cmd: 0 } })
      const oneWeekAgo = new Date(); oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
      ;(orders || []).filter(o => new Date(o.created_at) >= oneWeekAgo).forEach(o => {
        const d = dayNames[new Date(o.created_at).getDay()]
        weekly[d].ca += o.total || 0
        weekly[d].cmd++
      })
      setWeeklyData(dayNames.map(day => ({ day, ...weekly[day] })))

      // Top products by revenue from order items
      const productSales: Record<string, { name: string; ca: number; units: number }> = {}
      ;(orders || []).filter(o => o.status === 'delivered' || o.status === 'shipped').forEach(o => {
        if (Array.isArray(o.items)) {
          o.items.forEach((item: any) => {
            const pid = item.product_id || item.id
            if (!productSales[pid]) productSales[pid] = { name: item.name || pid, ca: 0, units: 0 }
            productSales[pid].ca += (item.price || 0) * (item.qty || 1)
            productSales[pid].units += item.qty || 1
          })
        }
      })
      setTopProducts(Object.values(productSales).sort((a, b) => b.ca - a.ca).slice(0, 5))
      setLoaded(true)
    }
    load()
  }, [])

  // Filter orders by period
  const now = new Date()
  const periodStart = new Date(now)
  if (period === 'day') periodStart.setDate(now.getDate() - 1)
  else if (period === 'week') periodStart.setDate(now.getDate() - 7)
  else if (period === 'month') periodStart.setMonth(now.getMonth() - 1)
  else periodStart.setFullYear(now.getFullYear() - 1)

  const periodOrders = allOrders.filter(o => new Date(o.created_at) >= periodStart)

  // Build daily chart data for the period
  const days: Record<string, { date: string; ca: number; commandes: number }> = {}
  const totalDays = period === 'day' ? 1 : period === 'week' ? 7 : period === 'month' ? 30 : 365
  for (let i = totalDays - 1; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i)
    const key = d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
    days[key] = { date: key, ca: 0, commandes: 0 }
  }
  periodOrders.forEach(o => {
    const key = new Date(o.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
    if (days[key]) { days[key].ca += o.total || 0; days[key].commandes++ }
  })
  const chartData = Object.values(days)

  const totalCA = periodOrders.reduce((s, o) => s + (o.total || 0), 0)
  const totalOrders = periodOrders.length
  const avgCart = totalOrders > 0 ? totalCA / totalOrders : 0

  return (
    <div>
      <Header title="Statistiques" subtitle="Analyse complète des performances" />

      <div className="flex bg-[#111] border border-[#222] rounded-xl p-1 gap-0.5 w-fit mb-6">
        {(['day', 'week', 'month', 'year'] as Period[]).map(p => (
          <button key={p} onClick={() => setPeriod(p)}
            className={`text-sm px-5 py-2 rounded-lg transition-all ${period === p ? 'bg-white text-black font-semibold' : 'text-zinc-500 hover:text-white'}`}>
            {p === 'day' ? 'Hier' : p === 'week' ? 'Semaine' : p === 'month' ? 'Mois' : 'Année'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Chiffre d\'affaires', value: formatPrice(totalCA), sub: `${totalOrders} commandes` },
          { label: 'Commandes', value: String(totalOrders), sub: 'Sur la période' },
          { label: 'Panier moyen', value: formatPrice(avgCart), sub: 'Par commande' },
          { label: 'Taux conversion', value: '—', sub: 'Non disponible' },
        ].map(({ label, value, sub }) => (
          <div key={label} className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-5">
            <p className="text-xs text-zinc-500 mb-2 uppercase tracking-wider">{label}</p>
            <p className="text-2xl font-bold text-white font-display mb-1">{value}</p>
            <p className="text-xs text-zinc-600">{sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-6">
          <h2 className="text-white font-semibold text-sm mb-5">CA sur la période</h2>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#fff" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#fff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: '#555', fontSize: 10 }} axisLine={false} tickLine={false}
                interval={Math.floor(chartData.length / 6)} />
              <YAxis tick={{ fill: '#555', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}€`} />
              <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, fontSize: 12 }} />
              <Area type="monotone" dataKey="ca" stroke="#fff" strokeWidth={2} fill="url(#g1)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-6">
          <h2 className="text-white font-semibold text-sm mb-5">CA par jour de la semaine</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: '#555', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#555', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}€`} />
              <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="ca" fill="#333" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-6">
        <h2 className="text-white font-semibold text-sm mb-5">
          Produits les plus performants {!loaded && <span className="text-zinc-600 font-normal text-xs">(chargement...)</span>}
        </h2>
        {topProducts.length === 0 ? (
          <p className="text-zinc-600 text-sm text-center py-8">Aucune vente enregistrée pour l'instant</p>
        ) : (
          <div className="space-y-4">
            {topProducts.map((p, i) => (
              <div key={i} className="flex items-center gap-4">
                <span className="w-5 text-xs text-zinc-600 font-mono">{i + 1}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-white font-medium">{p.name}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-zinc-500">{p.units} ventes</span>
                      <span className="text-sm font-semibold text-white">{formatPrice(p.ca)}</span>
                    </div>
                  </div>
                  <div className="w-full h-1.5 bg-[#1e1e1e] rounded-full overflow-hidden">
                    <div className="h-full bg-white rounded-full"
                      style={{ width: `${(p.ca / topProducts[0].ca) * 100}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
