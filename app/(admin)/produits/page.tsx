'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Search, Edit2, Trash2, Eye, EyeOff, Package, Loader2 } from 'lucide-react'
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
  images: string[]
  categories: { name: string; slug: string } | null
}

export default function ProduitsPage() {
  const [search, setSearch] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive' | 'rupture'>('all')
  const supabase = createClient()

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('products')
      .select('id, name, brand, price, stock, active, images, categories(name, slug)')
      .order('created_at', { ascending: false })
    if (error) toast.error('Erreur de chargement')
    else setProducts((data || []) as any)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.brand || '').toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'all' ? true
      : filter === 'active' ? p.active
      : filter === 'inactive' ? !p.active
      : p.stock === 0
    return matchSearch && matchFilter
  })

  async function toggleActive(p: Product) {
    const { error } = await supabase.from('products').update({ active: !p.active }).eq('id', p.id)
    if (error) { toast.error('Erreur'); return }
    setProducts(prev => prev.map(x => x.id === p.id ? { ...x, active: !p.active } : x))
    toast.success('Statut mis à jour')
  }

  async function deleteProduct(id: string) {
    if (!confirm('Supprimer ce produit ? Cette action est irréversible.')) return
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) { toast.error('Erreur lors de la suppression'); return }
    setProducts(prev => prev.filter(p => p.id !== id))
    toast.success('Produit supprimé')
  }

  return (
    <div>
      <Header
        title="Produits"
        subtitle={`${products.length} produits au total`}
        action={
          <Link href="/produits/nouveau"
            className="flex items-center gap-2 bg-white text-black text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-zinc-200 transition-colors font-display tracking-wide">
            <Plus size={15} />Ajouter
          </Link>
        }
      />

      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un produit..."
            className="w-full bg-[#111] border border-[#222] text-white text-sm pl-9 pr-4 py-2.5 rounded-xl outline-none focus:border-[#333] transition-colors placeholder:text-zinc-600" />
        </div>
        <div className="flex bg-[#111] border border-[#222] rounded-xl p-1 gap-0.5">
          {[{ key: 'all', label: 'Tous' }, { key: 'active', label: 'Actifs' }, { key: 'inactive', label: 'Inactifs' }, { key: 'rupture', label: 'Rupture' }].map(({ key, label }) => (
            <button key={key} onClick={() => setFilter(key as any)}
              className={`text-xs px-3 py-2 rounded-lg transition-all ${filter === key ? 'bg-white text-black font-semibold' : 'text-zinc-500 hover:text-white'}`}>
              {label}
            </button>
          ))}
        </div>
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
                {['Produit', 'Catégorie', 'Prix', 'Stock', 'Statut', 'Actions'].map(h => (
                  <th key={h} className="text-left text-[11px] text-zinc-600 font-medium uppercase tracking-wider px-6 py-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a1a1a]">
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-[#1a1a1a] transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] overflow-hidden flex-shrink-0">
                        {p.images?.[0] && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm text-white font-medium">{p.name}</p>
                        <p className="text-xs text-zinc-500">{p.brand}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-400">{(p.categories as any)?.name || '—'}</td>
                  <td className="px-6 py-4 text-sm text-white font-semibold">{formatPrice(p.price)}</td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${
                      p.stock === 0 ? 'text-red-400 bg-red-400/10' :
                      p.stock <= 3 ? 'text-yellow-400 bg-yellow-400/10' :
                      'text-green-400 bg-green-400/10'
                    }`}>
                      {p.stock === 0 ? 'Rupture' : `${p.stock} en stock`}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button onClick={() => toggleActive(p)}
                      className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-all ${
                        p.active ? 'text-white bg-[#1e1e1e] hover:bg-[#2a2a2a]' : 'text-zinc-500 hover:text-white'
                      }`}>
                      {p.active ? <Eye size={12} /> : <EyeOff size={12} />}
                      {p.active ? 'Actif' : 'Inactif'}
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Link href={`/produits/${p.id}`}
                        className="w-8 h-8 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-zinc-400 hover:text-white hover:border-[#333] transition-all">
                        <Edit2 size={13} />
                      </Link>
                      <button onClick={() => deleteProduct(p.id)}
                        className="w-8 h-8 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-zinc-400 hover:text-red-400 hover:border-red-400/30 transition-all">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Package size={32} className="text-zinc-700 mx-auto mb-3" />
                    <p className="text-zinc-500 text-sm">Aucun produit trouvé</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
