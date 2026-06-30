'use client'
import { useState, useEffect } from 'react'
import { Plus, Minus, AlertTriangle, TrendingDown, Package, Loader2 } from 'lucide-react'
import Header from '@/components/Header'
import { formatPrice } from '@/lib/utils'
import { createClient } from '@/lib/supabase'
import toast from 'react-hot-toast'

type Product = {
  id: string
  name: string
  brand: string | null
  price: number
  stock: number
  active: boolean
}

export default function StockPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [adjusting, setAdjusting] = useState<string | null>(null)
  const [qtyInput, setQtyInput] = useState('')
  const [reasonInput, setReasonInput] = useState('')
  const supabase = createClient()

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('products')
      .select('id, name, brand, price, stock, active')
      .order('name')
    if (error) toast.error('Erreur de chargement')
    else setProducts(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const totalValue = products.reduce((s, p) => s + p.price * p.stock, 0)
  const ruptures = products.filter(p => p.stock === 0)
  const faible = products.filter(p => p.stock > 0 && p.stock <= 3)

  async function applyAdjustment(id: string, isAdd: boolean) {
    const qty = parseInt(qtyInput)
    if (!qty || isNaN(qty)) return toast.error('Quantité invalide')

    const product = products.find(p => p.id === id)
    if (!product) return

    const newStock = Math.max(0, product.stock + (isAdd ? qty : -qty))

    const { error } = await supabase
      .from('products')
      .update({ stock: newStock })
      .eq('id', id)

    if (error) { toast.error('Erreur lors de la mise à jour'); return }

    await supabase.from('stock_movements').insert({
      product_id: id,
      quantity: isAdd ? qty : -qty,
      type: isAdd ? 'restock' : 'adjustment',
      reason: reasonInput || (isAdd ? 'Réapprovisionnement' : 'Ajustement manuel')
    })

    setProducts(prev => prev.map(p => p.id === id ? { ...p, stock: newStock } : p))
    toast.success(`Stock ${isAdd ? 'ajouté' : 'retiré'} : ${qty} unités`)
    setAdjusting(null)
    setQtyInput('')
    setReasonInput('')
  }

  return (
    <div>
      <Header title="Gestion du stock" subtitle="Suivi et mouvements de stock" />

      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Valeur du stock', value: formatPrice(totalValue), icon: Package, color: 'text-blue-400' },
          { label: 'Références', value: products.length.toString(), icon: Package, color: 'text-zinc-400' },
          { label: 'Ruptures de stock', value: ruptures.length.toString(), icon: AlertTriangle, color: 'text-red-400' },
          { label: 'Stock faible (≤3)', value: faible.length.toString(), icon: TrendingDown, color: 'text-yellow-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-5">
            <Icon size={16} className={`${color} mb-3`} />
            <div className="text-2xl font-bold text-white font-display mb-1">{value}</div>
            <div className="text-xs text-zinc-500">{label}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={20} className="animate-spin text-zinc-500" />
        </div>
      ) : (
        <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-[#1e1e1e]">
              <tr>
                {['Produit', 'Stock actuel', 'Valeur', 'Ajustement'].map(h => (
                  <th key={h} className="text-left text-[11px] text-zinc-600 font-medium uppercase tracking-wider px-6 py-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a1a1a]">
              {products.map(p => (
                <tr key={p.id} className="hover:bg-[#1a1a1a] transition-colors">
                  <td className="px-6 py-4">
                    <p className="text-sm text-white font-medium">{p.name}</p>
                    <p className="text-xs text-zinc-500">{p.brand}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-sm font-bold ${
                      p.stock === 0 ? 'text-red-400' : p.stock <= 3 ? 'text-yellow-400' : 'text-green-400'
                    }`}>
                      {p.stock === 0 ? 'Rupture' : `${p.stock} unités`}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-300">{formatPrice(p.price * p.stock)}</td>
                  <td className="px-6 py-4">
                    {adjusting === p.id ? (
                      <div className="flex items-center gap-2">
                        <input type="number" value={qtyInput} onChange={e => setQtyInput(e.target.value)}
                          placeholder="Qté" min={1}
                          className="w-20 bg-[#1a1a1a] border border-[#2a2a2a] text-white text-sm px-3 py-2 rounded-lg outline-none" />
                        <input value={reasonInput} onChange={e => setReasonInput(e.target.value)}
                          placeholder="Raison (optionnel)"
                          className="w-40 bg-[#1a1a1a] border border-[#2a2a2a] text-white text-sm px-3 py-2 rounded-lg outline-none" />
                        <button onClick={() => applyAdjustment(p.id, true)}
                          className="flex items-center gap-1 bg-green-400/10 text-green-400 text-xs px-3 py-2 rounded-lg hover:bg-green-400/20 transition-colors">
                          <Plus size={12} /> Ajouter
                        </button>
                        <button onClick={() => applyAdjustment(p.id, false)}
                          className="flex items-center gap-1 bg-red-400/10 text-red-400 text-xs px-3 py-2 rounded-lg hover:bg-red-400/20 transition-colors">
                          <Minus size={12} /> Retirer
                        </button>
                        <button onClick={() => { setAdjusting(null); setQtyInput(''); setReasonInput('') }}
                          className="text-xs text-zinc-500 hover:text-white px-2 py-2 transition-colors">✕</button>
                      </div>
                    ) : (
                      <button onClick={() => setAdjusting(p.id)}
                        className="text-xs text-zinc-400 hover:text-white bg-[#1a1a1a] border border-[#2a2a2a] px-3 py-2 rounded-lg transition-all hover:border-[#333]">
                        Ajuster
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
