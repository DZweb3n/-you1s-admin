'use client'
import { useState, useEffect } from 'react'
import { Search, Package, Truck, Check, X, Clock, RotateCcw, Loader2 } from 'lucide-react'
import Header from '@/components/Header'
import { ORDER_STATUSES, formatPrice, formatDate } from '@/lib/utils'
import { createClient } from '@/lib/supabase'
import toast from 'react-hot-toast'

const STATUS_ICONS: Record<string, any> = {
  pending: Clock, confirmed: Check, shipped: Truck,
  delivered: Package, cancelled: X, refunded: RotateCcw,
}

type Order = {
  id: string
  order_number: string
  customer_name: string
  customer_email: string
  total: number
  status: string
  created_at: string
  items: any[]
  shipping_address: any
  tracking_number: string | null
  notes: string | null
}

export default function CommandesPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [trackingInput, setTrackingInput] = useState('')
  const supabase = createClient()

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) toast.error('Erreur de chargement')
    else setOrders(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = orders.filter(o => {
    const matchSearch = o.order_number.toLowerCase().includes(search.toLowerCase()) ||
      o.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      o.customer_email.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || o.status === statusFilter
    return matchSearch && matchStatus
  })

  async function updateStatus(id: string, status: string) {
    const { error } = await supabase.from('orders').update({ status }).eq('id', id)
    if (error) { toast.error('Erreur lors de la mise à jour'); return }
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o))
    if (selectedOrder?.id === id) setSelectedOrder(prev => prev ? { ...prev, status } : null)
    toast.success(`Statut : ${ORDER_STATUSES[status]?.label}`)
  }

  async function saveTracking(id: string) {
    const { error } = await supabase.from('orders').update({ tracking_number: trackingInput }).eq('id', id)
    if (error) { toast.error('Erreur'); return }
    setOrders(prev => prev.map(o => o.id === id ? { ...o, tracking_number: trackingInput } : o))
    if (selectedOrder?.id === id) setSelectedOrder(prev => prev ? { ...prev, tracking_number: trackingInput } : null)
    toast.success('Numéro de suivi enregistré')
  }

  return (
    <div>
      <Header title="Commandes" subtitle={`${filtered.length} commandes`} />

      <div className="grid grid-cols-6 gap-4 mb-6">
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
        <div className={`${selectedOrder ? 'flex-1' : 'w-full'} bg-[#111] border border-[#1e1e1e] rounded-2xl overflow-hidden`}>
          <div className="p-4 border-b border-[#1e1e1e]">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Rechercher..."
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white text-sm pl-9 pr-4 py-2.5 rounded-xl outline-none focus:border-[#333] placeholder:text-zinc-600" />
              </div>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                className="bg-[#1a1a1a] border border-[#2a2a2a] text-white text-sm px-4 py-2.5 rounded-xl outline-none focus:border-[#333]">
                <option value="all">Tous statuts</option>
                {Object.entries(ORDER_STATUSES).map(([k, { label }]) => (
                  <option key={k} value={k}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={20} className="animate-spin text-zinc-500" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-zinc-500">
              <Package size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Aucune commande</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="border-b border-[#1e1e1e]">
                <tr>
                  {['N°', 'Client', 'Montant', 'Articles', 'Date', 'Statut', ''].map(h => (
                    <th key={h} className="text-left text-[11px] text-zinc-600 font-medium uppercase tracking-wider px-6 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a1a1a]">
                {filtered.map(o => {
                  const { label, color } = ORDER_STATUSES[o.status] || { label: o.status, color: 'text-zinc-400 bg-zinc-400/10 border-zinc-400/20' }
                  return (
                    <tr key={o.id} onClick={() => { setSelectedOrder(o); setTrackingInput(o.tracking_number || '') }}
                      className={`cursor-pointer hover:bg-[#1a1a1a] transition-colors ${selectedOrder?.id === o.id ? 'bg-[#1a1a1a]' : ''}`}>
                      <td className="px-6 py-4 text-sm font-mono text-white">{o.order_number}</td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-white">{o.customer_name}</p>
                        <p className="text-xs text-zinc-500">{o.customer_email}</p>
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-white">{formatPrice(o.total)}</td>
                      <td className="px-6 py-4 text-sm text-zinc-400">{Array.isArray(o.items) ? o.items.length : 0}</td>
                      <td className="px-6 py-4 text-xs text-zinc-500">{formatDate(o.created_at)}</td>
                      <td className="px-6 py-4">
                        <span className={`text-xs px-2 py-1 rounded border ${color}`}>{label}</span>
                      </td>
                      <td className="px-6 py-4">
                        <select value={o.status} onClick={e => e.stopPropagation()}
                          onChange={e => updateStatus(o.id, e.target.value)}
                          className="bg-[#1a1a1a] border border-[#2a2a2a] text-zinc-400 text-xs px-2 py-1.5 rounded-lg outline-none">
                          {Object.entries(ORDER_STATUSES).map(([k, { label: l }]) => (
                            <option key={k} value={k}>{l}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {selectedOrder && (
          <div className="w-80 bg-[#111] border border-[#1e1e1e] rounded-2xl p-5 h-fit sticky top-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold text-sm">{selectedOrder.order_number}</h3>
              <button onClick={() => setSelectedOrder(null)} className="text-zinc-500 hover:text-white transition-colors">
                <X size={14} />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <p className="text-zinc-500 mb-1">Client</p>
                <p className="text-white">{selectedOrder.customer_name}</p>
                <p className="text-zinc-400">{selectedOrder.customer_email}</p>
              </div>
              {selectedOrder.shipping_address && (
                <div>
                  <p className="text-zinc-500 mb-1">Adresse</p>
                  <p className="text-zinc-300">{selectedOrder.shipping_address.address}</p>
                  <p className="text-zinc-300">{selectedOrder.shipping_address.zip} {selectedOrder.shipping_address.city}</p>
                </div>
              )}
              <div>
                <p className="text-zinc-500 mb-1">Numéro de suivi</p>
                <div className="flex gap-2">
                  <input value={trackingInput} onChange={e => setTrackingInput(e.target.value)}
                    placeholder="Ex: 6A12345678901"
                    className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] text-white px-3 py-2 rounded-lg outline-none focus:border-white/30" />
                  <button onClick={() => saveTracking(selectedOrder.id)}
                    className="bg-white text-black px-3 py-2 rounded-lg font-semibold">OK</button>
                </div>
              </div>
              <div className="pt-2 border-t border-[#1e1e1e]">
                <p className="text-zinc-500 mb-2">Changer le statut</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {Object.entries(ORDER_STATUSES).map(([k, { label }]) => (
                    <button key={k} onClick={() => updateStatus(selectedOrder.id, k)}
                      className={`text-xs py-2 px-3 rounded-lg transition-all ${selectedOrder.status === k ? 'bg-white text-black font-semibold' : 'bg-[#1a1a1a] text-zinc-400 hover:text-white'}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
