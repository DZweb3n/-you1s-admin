'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
import Header from '@/components/Header'
import { createClient } from '@/lib/supabase'
import { slugify } from '@/lib/utils'
import toast from 'react-hot-toast'

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46']

type Category = { id: string; name: string }

export default function ProduitEditPage() {
  const { id } = useParams()
  const router = useRouter()
  const isNew = id === 'nouveau'
  const supabase = createClient()

  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    name: '',
    brand: '',
    description: '',
    price: '',
    comparePrice: '',
    costPrice: '',
    sku: '',
    category_id: '',
    stock: '0',
    active: true,
    sizes: [] as string[],
    colors: [] as string[],
  })

  useEffect(() => {
    async function init() {
      const { data: cats } = await supabase.from('categories').select('id, name').eq('active', true).order('name')
      setCategories(cats || [])

      if (!isNew) {
        const { data, error } = await supabase.from('products').select('*').eq('id', id).single()
        if (error || !data) { toast.error('Produit introuvable'); router.push('/produits'); return }
        setForm({
          name: data.name || '',
          brand: data.brand || '',
          description: data.description || '',
          price: data.price?.toString() || '',
          comparePrice: data.compare_price?.toString() || '',
          costPrice: data.cost_price?.toString() || '',
          sku: data.sku || '',
          category_id: data.category_id || '',
          stock: data.stock?.toString() || '0',
          active: data.active ?? true,
          sizes: Array.isArray(data.sizes) ? data.sizes : [],
          colors: Array.isArray(data.colors) ? data.colors : [],
        })
        setLoading(false)
      }
    }
    init()
  }, [])

  function update(field: string, value: any) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function toggleSize(size: string) {
    setForm(prev => ({
      ...prev,
      sizes: prev.sizes.includes(size) ? prev.sizes.filter(s => s !== size) : [...prev.sizes, size]
    }))
  }

  async function handleSave() {
    if (!form.name || !form.price) return toast.error('Nom et prix obligatoires')
    setSaving(true)

    const payload = {
      name: form.name,
      slug: slugify(form.name),
      brand: form.brand,
      description: form.description,
      price: parseFloat(form.price),
      compare_price: form.comparePrice ? parseFloat(form.comparePrice) : null,
      cost_price: form.costPrice ? parseFloat(form.costPrice) : null,
      sku: form.sku || null,
      category_id: form.category_id || null,
      stock: parseInt(form.stock) || 0,
      active: form.active,
      sizes: form.sizes,
      colors: form.colors,
    }

    if (isNew) {
      const { error } = await supabase.from('products').insert(payload)
      if (error) { toast.error('Erreur lors de la création'); setSaving(false); return }
      toast.success('Produit créé !')
      router.push('/produits')
    } else {
      const { error } = await supabase.from('products').update(payload).eq('id', id)
      if (error) { toast.error('Erreur lors de la sauvegarde'); setSaving(false); return }
      toast.success('Produit mis à jour !')
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Supprimer ce produit ? Cette action est irréversible.')) return
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) { toast.error('Erreur lors de la suppression'); return }
    toast.success('Produit supprimé')
    router.push('/produits')
  }

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <Loader2 size={24} className="animate-spin text-zinc-500" />
    </div>
  )

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/produits" className="w-8 h-8 rounded-lg bg-[#111] border border-[#222] flex items-center justify-center text-zinc-400 hover:text-white transition-colors">
          <ArrowLeft size={14} />
        </Link>
        <Header
          title={isNew ? 'Nouveau produit' : form.name || 'Modifier produit'}
          subtitle={isNew ? 'Remplissez les informations du produit' : `ID: ${id}`}
        />
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-4">
          {/* Infos générales */}
          <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-6">
            <h2 className="text-white font-semibold text-sm mb-5">Informations générales</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-xs text-zinc-500 uppercase tracking-wider mb-1.5 block">Nom du produit *</label>
                <input value={form.name} onChange={e => update('name', e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white text-sm px-4 py-3 rounded-xl outline-none focus:border-white/30 transition-colors placeholder:text-zinc-600"
                  placeholder="Ex: ASICS Gel-1130" />
              </div>
              <div>
                <label className="text-xs text-zinc-500 uppercase tracking-wider mb-1.5 block">Marque</label>
                <input value={form.brand} onChange={e => update('brand', e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white text-sm px-4 py-3 rounded-xl outline-none focus:border-white/30 transition-colors placeholder:text-zinc-600"
                  placeholder="Nike, Asics..." />
              </div>
              <div>
                <label className="text-xs text-zinc-500 uppercase tracking-wider mb-1.5 block">SKU</label>
                <input value={form.sku} onChange={e => update('sku', e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white text-sm px-4 py-3 rounded-xl outline-none focus:border-white/30 transition-colors placeholder:text-zinc-600"
                  placeholder="GEL-1130-BLK" />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-zinc-500 uppercase tracking-wider mb-1.5 block">Description</label>
                <textarea value={form.description} onChange={e => update('description', e.target.value)} rows={4}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white text-sm px-4 py-3 rounded-xl outline-none focus:border-white/30 transition-colors placeholder:text-zinc-600 resize-none"
                  placeholder="Description du produit..." />
              </div>
            </div>
          </div>

          {/* Prix */}
          <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-6">
            <h2 className="text-white font-semibold text-sm mb-5">Prix</h2>
            <div className="grid grid-cols-3 gap-4">
              {[
                { key: 'price', label: 'Prix de vente *', ph: '130' },
                { key: 'comparePrice', label: 'Prix barré', ph: '160' },
                { key: 'costPrice', label: 'Prix de revient', ph: '80' },
              ].map(({ key, label, ph }) => (
                <div key={key}>
                  <label className="text-xs text-zinc-500 uppercase tracking-wider mb-1.5 block">{label}</label>
                  <div className="relative">
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">€</span>
                    <input type="number" value={(form as any)[key]} onChange={e => update(key, e.target.value)}
                      className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white text-sm px-4 pr-8 py-3 rounded-xl outline-none focus:border-white/30 transition-colors placeholder:text-zinc-600"
                      placeholder={ph} />
                  </div>
                </div>
              ))}
            </div>
            {form.price && form.costPrice && (
              <div className="mt-4 p-3 bg-green-400/5 border border-green-400/10 rounded-xl">
                <p className="text-xs text-green-400">
                  Marge : {(((parseFloat(form.price) - parseFloat(form.costPrice)) / parseFloat(form.price)) * 100).toFixed(1)}%
                  ({(parseFloat(form.price) - parseFloat(form.costPrice)).toFixed(2)}€)
                </p>
              </div>
            )}
          </div>

          {/* Tailles */}
          <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-6">
            <h2 className="text-white font-semibold text-sm mb-5">Tailles disponibles</h2>
            <div className="flex flex-wrap gap-2">
              {SIZES.map(size => (
                <button key={size} onClick={() => toggleSize(size)}
                  className={`w-12 h-10 rounded-lg text-sm font-medium transition-all ${
                    form.sizes.includes(size)
                      ? 'bg-white text-black'
                      : 'bg-[#1a1a1a] border border-[#2a2a2a] text-zinc-400 hover:border-[#333] hover:text-white'
                  }`}>
                  {size}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-6">
            <h2 className="text-white font-semibold text-sm mb-5">Statut</h2>
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-300">Produit actif</span>
              <button onClick={() => update('active', !form.active)}
                className={`relative w-11 h-6 rounded-full transition-colors ${form.active ? 'bg-white' : 'bg-[#2a2a2a]'}`}>
                <div className={`absolute top-0.5 w-5 h-5 rounded-full transition-transform bg-black ${form.active ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>
            <p className="text-xs text-zinc-600 mt-2">{form.active ? 'Visible sur le site' : 'Masqué du site'}</p>
          </div>

          <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-6">
            <h2 className="text-white font-semibold text-sm mb-5">Catégorie</h2>
            <select value={form.category_id} onChange={e => update('category_id', e.target.value)}
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white text-sm px-4 py-3 rounded-xl outline-none focus:border-white/30 transition-colors">
              <option value="">Choisir...</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-6">
            <h2 className="text-white font-semibold text-sm mb-5">Stock</h2>
            <input type="number" value={form.stock} onChange={e => update('stock', e.target.value)} min={0}
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white text-sm px-4 py-3 rounded-xl outline-none focus:border-white/30 transition-colors" />
            {parseInt(form.stock) === 0 && (
              <p className="text-xs text-red-400 mt-2">⚠️ Produit en rupture de stock</p>
            )}
          </div>

          <button onClick={handleSave} disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-white text-black font-semibold text-sm py-3.5 rounded-xl hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-display tracking-wide">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>

          {!isNew && (
            <button onClick={handleDelete}
              className="w-full text-sm text-red-400 hover:text-red-300 py-2 transition-colors">
              Supprimer le produit
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
