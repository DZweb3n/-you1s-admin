'use client'
import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Upload, X } from 'lucide-react'
import Header from '@/components/Header'
import { DEMO_PRODUCTS } from '@/lib/utils'
import toast from 'react-hot-toast'

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46']
const CATEGORIES = ['Sneakers', 'Hauts', 'Bas', 'Accessoires', 'Vestes', 'Chaussettes']

export default function ProduitEditPage() {
  const { id } = useParams()
  const router = useRouter()
  const isNew = id === 'nouveau'

  const existing = !isNew ? DEMO_PRODUCTS.find(p => p.id === id) : null

  const [form, setForm] = useState({
    name: existing?.name || '',
    brand: existing?.brand || '',
    description: '',
    price: existing?.price?.toString() || '',
    comparePrice: '',
    costPrice: '',
    sku: '',
    category: existing?.category || '',
    stock: existing?.stock?.toString() || '0',
    active: existing?.active ?? true,
    sizes: ['40', '41', '42', '43'] as string[],
    images: [] as string[],
  })
  const [saving, setSaving] = useState(false)

  function update(field: string, value: any) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function toggleSize(size: string) {
    setForm(prev => ({
      ...prev,
      sizes: prev.sizes.includes(size)
        ? prev.sizes.filter(s => s !== size)
        : [...prev.sizes, size]
    }))
  }

  async function handleSave() {
    if (!form.name || !form.price) return toast.error('Nom et prix obligatoires')
    setSaving(true)
    await new Promise(r => setTimeout(r, 800))
    toast.success(isNew ? 'Produit créé !' : 'Produit mis à jour !')
    setSaving(false)
    if (isNew) router.push('/produits')
  }

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
        {/* Main form */}
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

          {/* Pricing */}
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

          {/* Images */}
          <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-6">
            <h2 className="text-white font-semibold text-sm mb-2">Images</h2>
            <p className="text-xs text-zinc-500 mb-5">Glissez-déposez les images ou cliquez pour importer</p>
            <div className="grid grid-cols-4 gap-3">
              <label className="aspect-square rounded-xl bg-[#1a1a1a] border-2 border-dashed border-[#2a2a2a] flex flex-col items-center justify-center cursor-pointer hover:border-[#444] transition-colors group col-span-1">
                <Upload size={20} className="text-zinc-600 group-hover:text-zinc-400 transition-colors mb-2" />
                <span className="text-xs text-zinc-600 group-hover:text-zinc-400 transition-colors">Ajouter</span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={() => toast.success('Connectez Supabase Storage pour l\'upload')} />
              </label>
              {form.images.map((img, i) => (
                <div key={i} className="aspect-square rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] relative group overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img} alt="" className="w-full h-full object-cover" />
                  <button onClick={() => update('images', form.images.filter((_, j) => j !== i))}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Status */}
          <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-6">
            <h2 className="text-white font-semibold text-sm mb-5">Statut</h2>
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-300">Produit actif</span>
              <button onClick={() => update('active', !form.active)}
                className={`relative w-11 h-6 rounded-full transition-colors ${form.active ? 'bg-white' : 'bg-[#2a2a2a]'}`}>
                <div className={`absolute top-0.5 w-5 h-5 rounded-full transition-transform bg-black ${form.active ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>
            <p className="text-xs text-zinc-600 mt-2">
              {form.active ? 'Visible sur le site' : 'Masqué du site'}
            </p>
          </div>

          {/* Catégorie */}
          <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-6">
            <h2 className="text-white font-semibold text-sm mb-5">Catégorie</h2>
            <select value={form.category} onChange={e => update('category', e.target.value)}
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white text-sm px-4 py-3 rounded-xl outline-none focus:border-white/30 transition-colors">
              <option value="">Choisir...</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Stock */}
          <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-6">
            <h2 className="text-white font-semibold text-sm mb-5">Stock</h2>
            <div>
              <label className="text-xs text-zinc-500 uppercase tracking-wider mb-1.5 block">Quantité</label>
              <input type="number" value={form.stock} onChange={e => update('stock', e.target.value)} min={0}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white text-sm px-4 py-3 rounded-xl outline-none focus:border-white/30 transition-colors" />
            </div>
            {parseInt(form.stock) === 0 && (
              <p className="text-xs text-red-400 mt-2">⚠️ Produit en rupture de stock</p>
            )}
          </div>

          {/* Save button */}
          <button onClick={handleSave} disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-white text-black font-semibold text-sm py-3.5 rounded-xl hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-display tracking-wide">
            <Save size={15} />
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>

          {!isNew && (
            <button onClick={() => {
              if (confirm('Supprimer ce produit ?')) {
                toast.success('Produit supprimé')
                router.push('/produits')
              }
            }}
              className="w-full text-sm text-red-400 hover:text-red-300 py-2 transition-colors">
              Supprimer le produit
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
