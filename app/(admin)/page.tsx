'use client'
import { useState, useEffect } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'
import Header from '@/components/Header'
import { formatPrice, formatDate, ORDER_STATUSES } from '@/lib/utils'
import { createClient } from '@/lib/supabase'

const PIE_COLORS = ['#f59e0b', '#3b82f6', '#a855f7', '#22c55e', '#ef4444', '#71717a']

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-3 text-xs">
      <p className="text-zinc-400 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} className="text-white font-semibold">
          {p.name === 'ca' ? formatPrice(p.value) : `${p.value} cmd`}
        </p>
      ))}
    </div>
  )
}

export default function DashboardPage() {
  const [stats, setStats] = useState({ products: 0, orders: 0, revenue: 0, customers: 0 })
  const [recentOrders, setRecentOrders] = useState<any[]>([])
  const [lowStock, setLowStock] = useState<any[]>([])
  const [chartData, setChartData] = useState<any[]>([])
  const [orderPie, setOrderPie] = useState<any[]>([])

  useEffect(() => {
    const supabase = createClient()
    async function load() {
      const [
        { count: prodCount },
        { data: orders },
        { count: custCount },
        { data: lowProds },
      ] = await Promise.all([
        supabase.from('products').select('*', { count: 'exact', head: true }),
        supabase.from('orders').select('id, order_number, customer_name, total, status, created_at').order('created_at', { ascending: false }),
        supabase.from('customers').select('*', { count: 'exact', head: true }),
        supabase.from('products').select('id, name, brand, stock').lte('stock', 3).order('stock'),
      ])

      const allOrders = orders || []
      const revenue = allOrders.reduce((s: number, o: any) => s + (o.total || 0), 0)
      setStats({ products: prodCount || 0, orders: allOrders.length, revenue, customers: custCount || 0 })
      setRecentOrders(allOrders.slice(0, 5))
      setLowStock(lowProds || [])

      /* Courbe CA : commandes groupées par jour (30 derniers jours) */
      const now = new Date()
      const days: Record<string, { ca: number; commandes: number }> = {}
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now); d.setDate(d.getDate() - i)
        const key = d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
        days[key] = { ca: 0, commandes: 0 }
      }
      allOrders.forEach((o: any) => {
        const key = new Date(o.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
        if (days[key]) { days[key].ca += o.total || 0; days[key].commandes++ }
      })
      setChartData(Object.entries(days).map(([date, v]) => ({ date, ...v })))

      /* Camembert : répartition par statut */
      const statusCount: Record<string, number> = {}
      allOrders.forEach((o: any) => { statusCount[o.status] = (statusCount[o.status] || 0) + 1 })
      setOrderPie(Object.entries(statusCount).map(([status, value]) => ({
        name: ORDER_STATUSES[status]?.label || status, value
      })))
    }
    load()
  }, [])

  return (
    <div>
      <Header
        title="Dashboard"
        subtitle={`Aujourd'hui, ${new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}`}
      />

      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Chiffre d\'affaires', value: formatPrice(stats.revenue) },
          { label: 'Commandes', value: String(stats.orders) },
          { label: 'Clients', value: String(stats.customers) },
          { label: 'Produits', value: String(stats.products) },
        ].map(({ label, value }) => (
          <div key={label} className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-6">
            <div className="text-2xl font-bold text-white mb-1">{value}</div>
            <div className="text-xs text-zinc-500">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="col-span-2 bg-[#111] border border-[#1e1e1e] rounded-2xl p-6">
          <div className="mb-6">
            <h2 className="text-white font-semibold text-sm">Évolution des ventes (30 jours)</h2>
            <p className="text-zinc-500 text-xs mt-0.5">{formatPrice(stats.revenue)} au total</p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="caGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: '#555', fontSize: 10 }} axisLine={false} tickLine={false} interval={6} />
              <YAxis tick={{ fill: '#555', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}€`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="ca" stroke="#a855f7" strokeWidth={2} fill="url(#caGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-6">
          <h2 className="text-white font-semibold text-sm mb-1">Statut commandes</h2>
          <p className="text-zinc-500 text-xs mb-4">{stats.orders} commandes total</p>
          {orderPie.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={orderPie} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" stroke="none">
                    {orderPie.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {orderPie.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-zinc-400">{item.name}</span>
                    </div>
                    <span className="text-zinc-300 font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-40 text-zinc-600 text-sm">Aucune commande</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 bg-[#111] border border-[#1e1e1e] rounded-2xl p-6">
          <h2 className="text-white font-semibold text-sm mb-5">Dernières commandes</h2>
          {recentOrders.length === 0 ? (
            <p className="text-zinc-600 text-sm text-center py-8">Aucune commande pour l'instant</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr>
                  {['Commande', 'Client', 'Total', 'Statut', 'Date'].map(h => (
                    <th key={h} className="text-left text-[11px] text-zinc-600 font-medium uppercase tracking-wider pb-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a1a1a]">
                {recentOrders.map((order: any) => {
                  const s = ORDER_STATUSES[order.status] || { label: order.status, color: 'text-zinc-400 bg-zinc-400/10 border-zinc-400/20' }
                  return (
                    <tr key={order.id}>
                      <td className="py-3 text-sm text-white font-mono">{order.order_number}</td>
                      <td className="py-3 text-sm text-zinc-300">{order.customer_name}</td>
                      <td className="py-3 text-sm text-white font-semibold">{formatPrice(order.total)}</td>
                      <td className="py-3"><span className={`text-xs px-2 py-1 rounded-md border ${s.color}`}>{s.label}</span></td>
                      <td className="py-3 text-xs text-zinc-500">{formatDate(order.created_at)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-6">
          <h2 className="text-white font-semibold text-sm mb-5">Stock faible (≤3)</h2>
          <div className="space-y-3">
            {lowStock.length === 0 ? (
              <p className="text-zinc-500 text-sm">Aucune rupture de stock</p>
            ) : lowStock.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white font-medium">{p.name}</p>
                  <p className="text-xs text-zinc-500">{p.brand}</p>
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded-lg ${p.stock === 0 ? 'text-red-400 bg-red-400/10' : 'text-yellow-400 bg-yellow-400/10'}`}>
                  {p.stock === 0 ? 'Rupture' : `${p.stock} restants`}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
