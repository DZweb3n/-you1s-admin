'use client'
import { useState } from 'react'
import { Search, ChevronDown, Package, Truck, Check, X, Clock, RotateCcw } from 'lucide-react'
import Header from '@/components/Header'
import { DEMO_ORDERS, ORDER_STATUSES, formatPrice, formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'

const STATUS_ICONS: Record<string, any> = {
  pending: Clock, confirmed: Check, shipped: Truck,
  delivered: Package, cancelled: X, refunded: RotateCcw,
}

export default function CommandesPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [orders, setOrders] = useState(DEMO_ORDERS)
  const [selectedOrder, setSelectedOrder] = useState<typeof DEMO_ORDERS[0] | null>(null)
  const [trackingInput, setTrackingInput] = useState('')

  const filtered = orders.filter(o => {
    const matchSearch = o.id.toLowerCase().includes(search.toLowerCase()) ||
      o.customer.toLowerCase().includes(search.toLowerCase()) ||
      o.email.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || o.status === statusFilter
    return matchSearch && matchStatus
  })

  function updateStatus(id: string, status: string) {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o))
    if (selectedOrder?.id === id) setSelectedOrder(prev => prev ? { ...prev, status } : null)
    toast.success(`Statut mis à jour : ${ORDER_STATUSES[status]?.label}`)
  }

  return (
    <div>
      <Header title="Commandes" subtitle={`${filtered.length} commandes`} />

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {Object.entries(ORDER_STATUSES).map(([key, { label, color }]) => {
          const count = orders.filter(o => o.status === key).length
          const Icon = STATUS_ICONS[key]
          return (
            <div key={key} className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <Icon size={14} className="text-zinc-500" />
                <span className={`text-xs px-1.5 py-0.5 rounded border ${color}`}>{label}</span>
              </div>
              <div className="text-2xl font-bold text-white font-display">{count}</div>
            </div>
          )
        })}
      </div>

      <div className="flex gap-6">
        {/* Orders table */}
        <div className={`${selectedOrder ? 'flex-1' : 'w-full'} bg-[#111] border border-[#1e1e1e] rounded-2xl overflow-hidden`}>
          <div className="p-4 border-b border-[#1e1e1e]">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher une commande..."
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white text-sm pl-9 pr-4 py-2.5 rounded-xl outline-none focus:border-[#333] placeholder:text-zinc-600" />
            </div>
          </div>
          <table className="w-full">
            <thead className="border-b border-[#1e1e1e]">
              <tr>
                {['N°', 'Client', 'Total', 'Articles', 'Statut', 'Date', ''].map(h => (
                  <th key={h} className="text-left text-[11px] text-zinc-600 font-medium uppercase tracking-wider px-5 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a1a1a]">
              {filtered.map(order => {
                const s = ORDER_STATUSES[order.status]
                const isSelected = selectedOrder?.id === order.id
                return (
                  <tr key={order.id}
                    onClick={() => setSelectedOrder(isSelected ? null : order)}
                    className={`cursor-pointer transition-colors ${isSelected ? 'bg-[#1e1e1e]' : 'hover:bg-[#1a1a1a]'}`}>
                    <td className="px-5 py-3 text-sm font-mono text-white font-medium">{order.id}</td>
                    <td className="px-5 py-3">
                      <p className="text-sm text-white">{order.customer}</p>
                      <p className="text-xs text-zinc-500">{order.email}</p>
                    </td>
                    <td className="px-5 py-3 text-sm font-semibold text-white">{formatPrice(order.total)}</td>
                    <td className="px-5 py-3 text-sm text-zinc-400">{order.items} article{order.items > 1 ? 's' : ''}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-1 rounded-md border ${s.color}`}>{s.label}</span>
                    </td>
                    <td className="px-5 py-3 text-xs text-zinc-500">{formatDate(order.date)}</td>
                    <td className="px-5 py-3 text-zinc-600">›</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Order detail panel */}
        {selectedOrder && (
          <div className="w-72 flex-shrink-0 bg-[#111] border border-[#1e1e1e] rounded-2xl p-5 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold text-sm">{selectedOrder.id}</h3>
              <button onClick={() => setSelectedOrder(null)} className="text-zinc-500 hover:text-white">
                <X size={14} />
              </button>
            </div>

            <div>
              <p className="text-xs text-zinc-500 mb-1">Client</p>
              <p className="text-sm text-white">{selectedOrder.customer}</p>
              <p className="text-xs text-zinc-500">{selectedOrder.email}</p>
            </div>

            <div>
              <p className="text-xs text-zinc-500 mb-1">Total</p>
              <p className="text-xl font-bold text-white font-display">{formatPrice(selectedOrder.total)}</p>
            </div>

            <div>
              <p className="text-xs text-zinc-500 mb-2">Changer le statut</p>
              <div className="space-y-1.5">
                {Object.entries(ORDER_STATUSES).map(([key, { label, color }]) => (
                  <button key={key} onClick={() => updateStatus(selectedOrder.id, key)}
                    className={`w-full text-left text-xs px-3 py-2 rounded-lg border transition-all ${
                      selectedOrder.status === key ? color : 'border-[#2a2a2a] text-zinc-500 hover:text-white hover:border-[#333]'
                    }`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs text-zinc-500 mb-1.5">N° de suivi</p>
              <div className="flex gap-2">
                <input value={trackingInput} onChange={e => setTrackingInput(e.target.value)}
                  placeholder="Numéro de suivi"
                  className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] text-white text-xs px-3 py-2 rounded-lg outline-none focus:border-white/30" />
                <button onClick={() => { toast.success('Numéro de suivi enregistré'); }}
                  className="bg-white text-black text-xs px-3 py-2 rounded-lg font-semibold hover:bg-zinc-200 transition-colors">OK</button>
              </div>
            </div>

            <button onClick={() => { if (confirm('Rembourser cette commande ?')) { updateStatus(selectedOrder.id, 'refunded') } }}
              className="w-full text-xs text-red-400 hover:text-red-300 py-2 transition-colors border border-red-400/20 rounded-lg hover:border-red-400/40">
              Initier un remboursement
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
