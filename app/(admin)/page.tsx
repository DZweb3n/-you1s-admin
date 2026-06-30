'use client'
import { useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts'
import {
  TrendingUp, ShoppingBag, Users, Package,
  ArrowUpRight, ArrowDownRight, AlertTriangle, Clock, Mail
} from 'lucide-react'
import Header from '@/components/Header'
import { formatPrice, DEMO_SALES, DEMO_ORDERS, DEMO_PRODUCTS, DEMO_NEWSLETTER, ORDER_STATUSES } from '@/lib/utils'

type Period = 'day' | 'week' | 'month' | 'year'

const PIE_COLORS = ['#f59e0b', '#3b82f6', '#a855f7', '#22c55e', '#ef4444']

const ORDER_PIE = [
  { name: 'En attente', value: 4 },
  { name: 'Confirmées', value: 7 },
  { name: 'Expédiées', value: 11 },
  { name: 'Livrées', value: 23 },
  { name: 'Annulées', value: 2 },
]

function StatCard({ label, value, sub, icon: Icon, trend, up }: {
  label: string; value: string; sub: string; icon: any; trend: string; up: boolean
}) {
  return (
    <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-6 hover:border-[#2a2a2a] transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center">
          <Icon size={18} className="text-zinc-400" />
        </div>
        <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg ${up ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10'}`}>
          {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {trend}
        </span>
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

export default function DashboardPage() {
  const [period, setPeriod] = useState<Period>('month')
  const chartData = period === 'day' ? DEMO_SALES.slice(-7) : period === 'week' ? DEMO_SALES.slice(-14) : DEMO_SALES

  const totalCA = DEMO_SALES.reduce((s, d) => s + d.ca, 0)
  const totalOrders = DEMO_SALES.reduce((s, d) => s + d.commandes, 0)
  const lowStock = DEMO_PRODUCTS.filter(p => p.stock <= 3)

  return (
    <div>
      <Header
        title="Dashboard"
        subtitle={`Aujourd'hui, ${new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}`}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <StatCard
          label="Chiffre d'affaires"
          value={formatPrice(totalCA)}
          sub="Ce mois-ci"
          icon={TrendingUp}
          trend="+12.4%"
          up={true}
        />
        <StatCard
          label="Commandes"
          value={String(totalOrders)}
          sub="Ce mois-ci"
          icon={ShoppingBag}
          trend="+8.1%"
          up={true}
        />
        <StatCard
          label="Clients"
          value="247"
          sub="Total inscrits"
          icon={Users}
          trend="+3 ce mois"
          up={true}
        />
        <StatCard
          label="Newsletter"
          value={String(DEMO_NEWSLETTER)}
          sub="Abonnés actifs"
          icon={Mail}
          trend="+5 ce mois"
          up={true}
        />
        <StatCard
          label="Valeur stock"
          value={formatPrice(DEMO_PRODUCTS.reduce((s, p) => s + p.price * p.stock, 0))}
          sub="5 références actives"
          icon={Package}
          trend="-2.3%"
          up={false}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* Sales area chart */}
        <div className="col-span-2 bg-[#111] border border-[#1e1e1e] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-white font-semibold text-sm">Évolution des ventes</h2>
              <p className="text-zinc-500 text-xs mt-0.5">{formatPrice(totalCA)} sur la période</p>
            </div>
            <div className="flex bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-1 gap-0.5">
              {(['day', 'week', 'month', 'year'] as Period[]).map(p => (
                <button key={p} onClick={() => setPeriod(p)}
                  className={`text-xs px-3 py-1.5 rounded-lg transition-all ${period === p ? 'bg-white text-black font-semibold' : 'text-zinc-500 hover:text-white'}`}>
                  {p === 'day' ? '7j' : p === 'week' ? '14j' : p === 'month' ? '30j' : '1an'}
                </button>
              ))}
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
              <XAxis dataKey="date" tick={{ fill: '#555', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#555', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}€`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="ca" stroke="#fff" strokeWidth={2} fill="url(#caGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Order status pie */}
        <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-6">
          <h2 className="text-white font-semibold text-sm mb-1">Statut commandes</h2>
          <p className="text-zinc-500 text-xs mb-4">47 commandes total</p>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={ORDER_PIE} cx="50%" cy="50%" innerRadius={45} outerRadius={70}
                dataKey="value" stroke="none">
                {ORDER_PIE.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {ORDER_PIE.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: PIE_COLORS[i] }} />
                  <span className="text-zinc-400">{item.name}</span>
                </div>
                <span className="text-zinc-300 font-medium">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-3 gap-4">
        {/* Recent orders */}
        <div className="col-span-2 bg-[#111] border border-[#1e1e1e] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-white font-semibold text-sm">Dernières commandes</h2>
            <a href="/commandes" className="text-xs text-zinc-500 hover:text-white transition-colors">Voir tout →</a>
          </div>
          <table className="w-full">
            <thead>
              <tr>
                {['Commande', 'Client', 'Total', 'Statut', 'Date'].map(h => (
                  <th key={h} className="text-left text-[11px] text-zinc-600 font-medium uppercase tracking-wider pb-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a1a1a]">
              {DEMO_ORDERS.map(order => {
                const s = ORDER_STATUSES[order.status]
                return (
                  <tr key={order.id} className="hover:bg-[#1a1a1a] transition-colors">
                    <td className="py-3 text-sm text-white font-mono font-medium">{order.id}</td>
                    <td className="py-3 text-sm text-zinc-300">{order.customer}</td>
                    <td className="py-3 text-sm text-white font-semibold">{formatPrice(order.total)}</td>
                    <td className="py-3">
                      <span className={`text-xs px-2 py-1 rounded-md border ${s.color}`}>{s.label}</span>
                    </td>
                    <td className="py-3 text-xs text-zinc-500">{new Date(order.date).toLocaleDateString('fr-FR')}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Low stock alerts */}
        <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <AlertTriangle size={15} className="text-yellow-400" />
            <h2 className="text-white font-semibold text-sm">Stock faible</h2>
          </div>
          <div className="space-y-3">
            {lowStock.map(p => (
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
            {lowStock.length === 0 && (
              <p className="text-zinc-500 text-sm">Aucune rupture de stock 🎉</p>
            )}
          </div>

          <div className="mt-6 pt-5 border-t border-[#1e1e1e]">
            <div className="flex items-center gap-2 mb-3">
              <Clock size={14} className="text-zinc-500" />
              <h3 className="text-white text-xs font-semibold">Activité récente</h3>
            </div>
            <div className="space-y-2.5">
              {[
                { text: 'Commande CMD-004 reçue', time: 'Il y a 5 min', color: 'bg-blue-400' },
                { text: 'Stock Menilo mis à jour', time: 'Il y a 1h', color: 'bg-green-400' },
                { text: 'CMD-002 marquée livrée', time: 'Il y a 3h', color: 'bg-purple-400' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${item.color}`} />
                  <div>
                    <p className="text-xs text-zinc-300">{item.text}</p>
                    <p className="text-[10px] text-zinc-600">{item.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
