'use client'
import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import { formatPrice, formatDate, ORDER_STATUSES } from '@/lib/utils'
import { createClient } from '@/lib/supabase'

export default function DashboardPage() {
  const [stats, setStats] = useState({ products: 0, orders: 0, revenue: 0, customers: 0 })
  const [recentOrders, setRecentOrders] = useState<any[]>([])
  const [lowStock, setLowStock] = useState<any[]>([])

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
        supabase.from('orders').select('id, order_number, customer_name, total, status, created_at').order('created_at', { ascending: false }).limit(5),
        supabase.from('customers').select('*', { count: 'exact', head: true }),
        supabase.from('products').select('id, name, brand, stock').lte('stock', 3).order('stock'),
      ])

      const allOrders = orders || []
      const revenue = allOrders.reduce((s: number, o: any) => s + (o.total || 0), 0)
      setStats({ products: prodCount || 0, orders: allOrders.length, revenue, customers: custCount || 0 })
      setRecentOrders(allOrders)
      setLowStock(lowProds || [])
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
