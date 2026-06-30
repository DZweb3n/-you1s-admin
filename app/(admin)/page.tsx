'use client'
import { useState, useEffect } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'
import {
  TrendingUp, ShoppingBag, Users, Package,
  ArrowUpRight, AlertTriangle, Clock
} from 'lucide-react'
import Header from '@/components/Header'
import { formatPrice, formatDate, ORDER_STATUSES } from '@/lib/utils'
import { createClient } from '@/lib/supabase'

const PIE_COLORS = ['#f59e0b', '#3b82f6', '#a855f7', '#22c55e', '#ef4444', '#71717a']

function StatCard({ label, value, sub, icon: Icon }: { label: string; value: string; sub: string; icon: any }) {
  return (
    <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-6 hover:border-[#2a2a2a] transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center">
          <Icon size={18} className="text-zinc-400" />
        </div>
      </div>
      <div className="text-2xl font-display font-bold text-white mb-1">{value}</div>
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="text-[11px] text-zinc-600 mt-1">{sub}</div>
    </div>
  )
}

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

type Order = {
  id: string; order_number: string; customer_name: string
  customer_email: string; total: number; status: string; created_at: string; items: any[]
}

export default function DashboardPage() {
  const supabase = createClient()
  const [stats, setStats] = useState({ products: 0, orders: 0, revenue: 0, customers: 0, stockValue: 0 })
  const [lowStock, setLowStock] = useState<any[]>([])
  const [recentOrders, setRecentOrders] = useState<Order[]>([])
  const [chartData, setChartData] = useState<any[]>([])
  const [orderPie, setOrderPie] = useState<any[]>([])

  useEffect(() => {
    async function load() {
      const [
        { count: prodCount },
        { data: products },
        { data: orders },
        { count: custCount },
      ] = await Promise.all([
        supabase.from('products').select('*', { count: 'exact', head: true }),
        supabase.from('products').select('id, name, brand, price, stock').lte('stock', 3).order('stock'),
        supabase.from('orders').select('*').order('created_at', { ascending: false }),
        supabase.from('customers').select('*', { count: 'exact', head: true }),
      ])

      const allOrders = orders || []
      const revenue = allOrders.reduce((s: number, o: any) => s + (o.total || 0), 0)

      // Build chart data: group orders by day (last 30 days)
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

      // Order pie
      const statusCount: Record<string, number> = {}
      allOrders.forEach((o: any) => { statusCount[o.status] = (statusCount[o.status] || 0) + 1 })
      setOrderPie(Object.entries(statusCount).map(([status, value]) => ({
        name: ORDER_STATUSES[status]?.label || status, value
      })))

      // Stock value
      const { data: allProds } = await supabase.from('products').select('price, stock')
      const stockValue = (allProds || []).reduce((s: number, p: any) => s + p.price * p.stock, 0)

      setStats({ products: prodCount || 0, orders: allOrders.length, revenue, customers: custCount || 0, stockValue })
      setLowStock(products || [])
      setRecentOrders(allOrders.slice(0, 5))
    }
    load()
  }, [])

  return (
    <div>
      <Header
        title="Dashboard"
        subtitle={`Aujourd'hui, ${new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}`}
      />

      <div className="grid grid-cols-5 gap-4 mb-6">
        <StatCard label="Chiffre d'affaires" value={formatPrice(stats.revenue)} sub="Total commandes" icon={TrendingUp} />
        <StatCard label="Commandes" value={String(stats.orders)} sub="Total reçues" icon={ShoppingBag} />
        <StatCard label="Clients" value={String(stats.customers)} sub="Inscrits" icon={Users} />
        <StatCard label="Produits" value={String(stats.products)} sub="Références actives" icon={Package} />
        <StatCard label="Valeur stock" value={formatPrice(stats.stockValue)} sub="Inventaire total" icon={Package} />
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="col-span-2 bg-[#111] border border-[#1e1e1e] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-white font-semibold text-sm">Évolution des ventes (30 jours)</h2>
              <p className="text-zinc-500 text-xs mt-0.5">{formatPrice(stats.revenue)} sur la période</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="caGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ffffff" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#ffffff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: '#555', fontSize: 10 }} axisLine={false} tickLine={false} interval={6} />
              <YAxis tick={{ fill: '#555', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}€`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="ca" stroke="#fff" strokeWidth={2} fill="url(#caGrad)" dot={false} />
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
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-white font-semibold text-sm">Dernières commandes</h2>
            <a href="/commandes" className="text-xs text-zinc-500 hover:text-white transition-colors">Voir tout →</a>
          </div>
          {recentOrders.length === 0 ? (
            <div className="text-center py-8 text-zinc-600 text-sm">Aucune commande pour l'instant</div>
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
                {recentOrders.map(order => {
                  const s = ORDER_STATUSES[order.status] || { label: order.status, color: 'text-zinc-400 bg-zinc-400/10 border-zinc-400/20' }
                  return (
                    <tr key={order.id} className="hover:bg-[#1a1a1a] transition-colors">
                      <td className="py-3 text-sm text-white font-mono font-medium">{order.order_number}</td>
                      <td className="py-3 text-sm text-zinc-300">{order.customer_name}</td>
                      <td className="py-3 text-sm text-white font-semibold">{formatPrice(order.total)}</td>
                      <td className="py-3">
                        <span className={`text-xs px-2 py-1 rounded-md border ${s.color}`}>{s.label}</span>
                      </td>
                      <td className="py-3 text-xs text-zinc-500">{formatDate(order.created_at)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <AlertTriangle size={15} className="text-yellow-400" />
            <h2 className="text-white font-semibold text-sm">Stock faible (≤3)</h2>
          </div>
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

          <div className="mt-6 pt-5 border-t border-[#1e1e1e]">
            <div className="flex items-center gap-2 mb-3">
              <Clock size={14} className="text-zinc-500" />
              <h3 className="text-white text-xs font-semibold">Activité récente</h3>
            </div>
            {recentOrders.length === 0 ? (
              <p className="text-zinc-600 text-xs">Aucune activité récente</p>
            ) : recentOrders.slice(0, 3).map((o, i) => (
              <div key={i} className="flex items-start gap-2.5 mb-2.5">
                <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 bg-blue-400" />
                <div>
                  <p className="text-xs text-zinc-300">Commande {o.order_number}</p>
                  <p className="text-[10px] text-zinc-600">{formatDate(o.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
