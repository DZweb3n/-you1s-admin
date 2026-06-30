'use client'
import { useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import Header from '@/components/Header'
import { formatPrice, DEMO_SALES, DEMO_PRODUCTS } from '@/lib/utils'

const TOP_PRODUCTS = [
  { name: 'ASICS Gel-1130', ca: 2340, units: 18, margin: 38 },
  { name: 'Saucony Progrid', ca: 1963, units: 18, margin: 35 },
  { name: 'ATM Pant', ca: 1160, units: 8, margin: 42 },
  { name: 'Essential Tee', ca: 855, units: 9, margin: 44 },
  { name: 'T-Shirt Menilo', ca: 680, units: 8, margin: 40 },
]

const WEEKLY = [
  { day: 'Lun', ca: 420, cmd: 3 },
  { day: 'Mar', ca: 680, cmd: 5 },
  { day: 'Mer', ca: 320, cmd: 2 },
  { day: 'Jeu', ca: 890, cmd: 7 },
  { day: 'Ven', ca: 1240, cmd: 9 },
  { day: 'Sam', ca: 760, cmd: 6 },
  { day: 'Dim', ca: 440, cmd: 3 },
]

type Period = 'day' | 'week' | 'month' | 'year'

export default function StatistiquesPage() {
  const [period, setPeriod] = useState<Period>('month')

  const periodData = period === 'day'
    ? DEMO_SALES.slice(-1)
    : period === 'week'
    ? DEMO_SALES.slice(-7)
    : period === 'year'
    ? DEMO_SALES
    : DEMO_SALES

  const totalCA = periodData.reduce((s, d) => s + d.ca, 0)
  const totalOrders = periodData.reduce((s, d) => s + d.commandes, 0)
  const avgCart = totalOrders > 0 ? totalCA / totalOrders : 0
  const totalMargin = totalCA * 0.38

  const prevCA = period === 'day'
    ? DEMO_SALES.slice(-2, -1).reduce((s, d) => s + d.ca, 0)
    : period === 'week'
    ? DEMO_SALES.slice(-14, -7).reduce((s, d) => s + d.ca, 0)
    : totalCA * 0.88

  const caGrowth = prevCA > 0 ? (((totalCA - prevCA) / prevCA) * 100).toFixed(1) : '0'

  return (
    <div>
      <Header title="Statistiques" subtitle="Analyse complète des performances" />

      {/* Period selector */}
      <div className="flex bg-[#111] border border-[#222] rounded-xl p-1 gap-0.5 w-fit mb-6">
        {(['day', 'week', 'month', 'year'] as Period[]).map(p => (
          <button key={p} onClick={() => setPeriod(p)}
            className={`text-sm px-5 py-2 rounded-lg transition-all ${period === p ? 'bg-white text-black font-semibold' : 'text-zinc-500 hover:text-white'}`}>
            {p === 'day' ? 'Aujourd\'hui' : p === 'week' ? 'Semaine' : p === 'month' ? 'Mois' : 'Année'}
          </button>
        ))}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Chiffre d\'affaires', value: formatPrice(totalCA), sub: `vs ${formatPrice(prevCA)} période préc.`, delta: `${parseFloat(caGrowth) >= 0 ? '+' : ''}${caGrowth}%`, up: parseFloat(caGrowth) >= 0 },
          { label: 'Commandes', value: totalOrders.toString(), sub: 'Panier moyen : ' + formatPrice(avgCart), delta: '+8.1%', up: true },
          { label: 'Marge brute', value: formatPrice(totalMargin), sub: 'Taux moyen 38%', delta: '+2.1%', up: true },
          { label: 'Panier moyen', value: formatPrice(avgCart), sub: 'Sur toutes commandes', delta: '-1.2%', up: false },
        ].map(({ label, value, sub, delta, up }) => (
          <div key={label} className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-5">
            <p className="text-xs text-zinc-500 mb-2 uppercase tracking-wider">{label}</p>
            <p className="text-2xl font-bold text-white font-display mb-1">{value}</p>
            <div className="flex items-center justify-between">
              <p className="text-xs text-zinc-600">{sub}</p>
              <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${up ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10'}`}>{delta}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-6">
          <h2 className="text-white font-semibold text-sm mb-5">CA sur 30 jours</h2>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={periodData}>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#fff" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#fff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: '#555', fontSize: 10 }} axisLine={false} tickLine={false} interval={6} />
              <YAxis tick={{ fill: '#555', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}€`} />
              <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, fontSize: 12 }} />
              <Area type="monotone" dataKey="ca" stroke="#fff" strokeWidth={2} fill="url(#g1)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-6">
          <h2 className="text-white font-semibold text-sm mb-5">CA par jour de la semaine</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={WEEKLY}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: '#555', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#555', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}€`} />
              <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="ca" fill="#333" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top products */}
      <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-6">
        <h2 className="text-white font-semibold text-sm mb-5">Produits les plus performants</h2>
        <div className="space-y-4">
          {TOP_PRODUCTS.map((p, i) => (
            <div key={p.name} className="flex items-center gap-4">
              <span className="w-5 text-xs text-zinc-600 font-mono">{i + 1}</span>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm text-white font-medium">{p.name}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-zinc-500">{p.units} ventes</span>
                    <span className="text-xs text-green-400">{p.margin}% marge</span>
                    <span className="text-sm font-semibold text-white">{formatPrice(p.ca)}</span>
                  </div>
                </div>
                <div className="w-full h-1.5 bg-[#1e1e1e] rounded-full overflow-hidden">
                  <div className="h-full bg-white rounded-full" style={{ width: `${(p.ca / TOP_PRODUCTS[0].ca) * 100}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
