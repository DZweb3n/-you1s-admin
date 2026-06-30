'use client'
import { useState, Fragment } from 'react'
import { Plus, Minus, AlertTriangle, TrendingDown, Package } from 'lucide-react'
import Header from '@/components/Header'
import { DEMO_PRODUCTS, formatPrice } from '@/lib/utils'
import toast from 'react-hot-toast'

const MOVEMENTS = [
  { id: '1', product: 'ASICS Gel-1130', type: 'sale', qty: -1, reason: 'Vente CMD-002', date: '2026-06-28' },
  { id: '2', product: 'Saucony Progrid', type: 'restock', qty: +5, reason: 'Réapprovisionnement', date: '2026-06-27' },
  { id: '3', product: 'T-Shirt Menilo', type: 'sale', qty: -2, reason: 'Vente CMD-001', date: '2026-06-26' },
  { id: '4', product: 'ATM Pant', type: 'adjustment', qty: -1, reason: 'Produit défectueux', date: '2026-06-25' },
]

export default function StockPage() {
  const [products, setProducts] = useState(DEMO_PRODUCTS)
  const [adjusting, setAdjusting] = useState<string | null>(null)
  const [qtyInput, setQtyInput] = useState('')
  const [reasonInput, setReasonInput] = useState('')

  const totalValue = products.reduce((s, p) => s + p.price * p.stock, 0)
  const ruptures = products.filter(p => p.stock === 0)
  const faible = products.filter(p => p.stock > 0 && p.stock <= 3)

  function applyAdjustment(id: string, isAdd: boolean) {
    const qty = parseInt(qtyInput)
    if (!qty || isNaN(qty)) return toast.error('Quantité invalide')
    setProducts(prev => prev.map(p => p.id === id
      ? { ...p, stock: Math.max(0, p.stock + (isAdd ? qty : -qty)) }
      : p))
    toast.success(`Stock ${isAdd ? 'ajouté' : 'retiré'} : ${qty} unités`)
    setAdjusting(null)
    setQtyInput('')
    setReasonInput('')
  }

  return (
    <div>
      <Header title="Gestion du stock" subtitle="Suivi et mouvements de stock" />

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Valeur du stock', value: formatPrice(totalValue), icon: Package, color: 'text-blue-400' },
          { label: 'Références', value: products.length.toString(), icon: Package, color: 'text-zinc-400' },
          { label: 'Ruptures de stock', value: ruptures.length.toString(), icon: AlertTriangle, color: 'text-red-400' },
          { label: 'Stock faible (≤3)', value: faible.length.toString(), icon: TrendingDown, color: 'text-yellow-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-5">
            <Icon size={16} className={`${color} mb-3`} />
            <div className="text-xl font-bold text-white font-display">{value}</div>
            <div className="text-xs text-zinc-500 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Stock table */}
        <div className="col-span-2 bg-[#111] border border-[#1e1e1e] rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-[#1e1e1e]">
            <h2 className="text-white font-semibold text-sm">Niveaux de stock</h2>
          </div>
          <table className="w-full">
            <thead className="border-b border-[#1a1a1a]">
              <tr>
                {['Produit', 'Stock', 'Valeur', 'Statut', 'Ajuster'].map(h => (
                  <th key={h} className="text-left text-[11px] text-zinc-600 uppercase tracking-wider px-6 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a1a1a]">
              {products.map(p => (
                <Fragment key={p.id}>
                  <tr className="hover:bg-[#1a1a1a] transition-colors">
                    <td className="px-6 py-3">
                      <p className="text-sm text-white font-medium">{p.name}</p>
                      <p className="text-xs text-zinc-500">{p.brand}</p>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${
                            p.stock === 0 ? 'bg-red-500' : p.stock <= 3 ? 'bg-yellow-500' : 'bg-green-500'
                          }`} style={{ width: `${Math.min(100, (p.stock / 15) * 100)}%` }} />
                        </div>
                        <span className="text-sm text-white font-semibold">{p.stock}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-sm text-zinc-300">{formatPrice(p.price * p.stock)}</td>
                    <td className="px-6 py-3">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${
                        p.stock === 0 ? 'text-red-400 bg-red-400/10' :
                        p.stock <= 3 ? 'text-yellow-400 bg-yellow-400/10' :
                        'text-green-400 bg-green-400/10'
                      }`}>
                        {p.stock === 0 ? 'Rupture' : p.stock <= 3 ? 'Faible' : 'OK'}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <button onClick={() => setAdjusting(adjusting === p.id ? null : p.id)}
                        className="text-xs text-zinc-400 hover:text-white border border-[#2a2a2a] hover:border-[#333] px-3 py-1.5 rounded-lg transition-all">
                        Modifier
                      </button>
                    </td>
                  </tr>
                  {adjusting === p.id && (
                    <tr className="bg-[#1a1a1a]">
                      <td colSpan={5} className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <input type="number" min={1} value={qtyInput} onChange={e => setQtyInput(e.target.value)}
                            placeholder="Quantité"
                            className="w-28 bg-[#111] border border-[#2a2a2a] text-white text-sm px-3 py-2 rounded-lg outline-none focus:border-white/30" />
                          <input value={reasonInput} onChange={e => setReasonInput(e.target.value)}
                            placeholder="Motif (optionnel)"
                            className="flex-1 max-w-xs bg-[#111] border border-[#2a2a2a] text-white text-sm px-3 py-2 rounded-lg outline-none focus:border-white/30" />
                          <button onClick={() => applyAdjustment(p.id, true)}
                            className="flex items-center gap-1.5 text-xs bg-green-500/10 text-green-400 border border-green-500/20 px-3 py-2 rounded-lg hover:bg-green-500/20 transition-colors">
                            <Plus size={12} /> Ajouter
                          </button>
                          <button onClick={() => applyAdjustment(p.id, false)}
                            className="flex items-center gap-1.5 text-xs bg-red-500/10 text-red-400 border border-red-500/20 px-3 py-2 rounded-lg hover:bg-red-500/20 transition-colors">
                            <Minus size={12} /> Retirer
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* Movement history */}
        <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-6">
          <h2 className="text-white font-semibold text-sm mb-5">Historique des mouvements</h2>
          <div className="space-y-3">
            {MOVEMENTS.map(m => (
              <div key={m.id} className="flex items-start gap-3 pb-3 border-b border-[#1a1a1a] last:border-0">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  m.qty > 0 ? 'bg-green-400/10 text-green-400' : 'bg-red-400/10 text-red-400'
                }`}>
                  {m.qty > 0 ? '+' : ''}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white font-medium truncate">{m.product}</p>
                  <p className="text-xs text-zinc-500">{m.reason}</p>
                  <p className="text-[10px] text-zinc-600 mt-0.5">{new Date(m.date).toLocaleDateString('fr-FR')}</p>
                </div>
                <span className={`text-xs font-bold ${m.qty > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {m.qty > 0 ? `+${m.qty}` : m.qty}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
