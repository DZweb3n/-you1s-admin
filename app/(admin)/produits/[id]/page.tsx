'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Loader2, Upload, X, ImagePlus, Plus } from 'lucide-react'
import Header from '@/components/Header'
import { createClient } from '@/lib/supabase'
import { slugify } from '@/lib/utils'
import toast from 'react-hot-toast'

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '36', '36.5', '37', '37.5', '38', '38.5', '39', '39.5', '40', '40.5', '41', '41.5', '42', '42.5', '43', '43.5', '44', '44.5', '45', '45.5', '46']
const STORAGE_BUCKET = 'products'

const COLOR_PRESETS = ['Noir', 'Blanc', 'Gris', 'Beige', 'Bleu', 'Rouge', 'Vert', 'Marron', 'Marine', 'Kaki', 'Rose', 'Bordeaux']
// Doit rester cohérent avec la carte couleurs du filtre du site (catalogue.html)
const COLOR_HEX: Record<string, string> = {
  noir: '#0a0a0a', blanc: '#ffffff', gris: '#b4b4b4', beige: '#d8c4a0', bleu: '#3f5c8f',
  rouge: '#c0392b', vert: '#3a7d44', jaune: '#e8c245', orange: '#e07b39', rose: '#e59bb6',
  violet: '#7d5ba6', marron: '#7a5230', marine: '#20344f', kaki: '#7c7b4f', bordeaux: '#6d1f2e',
  or: '#c9a227', argent: '#c0c0c0', turquoise: '#3fb8af', creme: '#f3ead3', camel: '#c19a6b',
}
const colorHex = (name: string) => COLOR_HEX[name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')] || '#c9c9c9'

type Category = { id: string; name: string; subcats?: { name: string; image?: string | null }[] }

export default function ProduitEditPage() {
  const { id } = useParams()
  const router = useRouter()
  const isNew = id === 'nouveau'
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [categories, setCategories] = useState<Category[]>([])
  const [brandOptions, setBrandOptions] = useState<string[]>([])
  const [newBrandMode, setNewBrandMode] = useState(false)
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [images, setImages] = useState<string[]>([])
  const [colorInput, setColorInput] = useState('')

  const [form, setForm] = useState({
    name: '',
    brand: '',
    description: '',
    material: '',
    price: '',
    comparePrice: '',
    costPrice: '',
    sku: '',
    category_id: '',
    subcategory: '',
    stock: '0',
    active: true,
    featured: false,
    pretAPorter: false,
    sizes: [] as string[],
    colors: [] as string[],
  })

  useEffect(() => {
    async function init() {
      const { data: cats } = await supabase.from('categories').select('id, name, subcats').eq('active', true).order('sort_order')
      setCategories((cats || []).map((c: any) => ({ ...c, subcats: Array.isArray(c.subcats) ? c.subcats : [] })))

      /* Marques proposées : table Marques + marques déjà utilisées par les produits
         (dédoublonnées sans tenir compte de la casse ni des espaces) */
      const [{ data: brandRows }, { data: prodBrands }] = await Promise.all([
        supabase.from('brands').select('name').order('sort_order'),
        supabase.from('products').select('brand'),
      ])
      const seen = new Map<string, string>()
      ;[...(brandRows || []).map((b: any) => b.name), ...(prodBrands || []).map((p: any) => p.brand)]
        .map((n: any) => String(n || '').trim())
        .filter(Boolean)
        .forEach(n => { const k = n.toLowerCase(); if (!seen.has(k)) seen.set(k, n) })
      setBrandOptions(Array.from(seen.values()).sort((a, b) => a.localeCompare(b, 'fr')))

      if (!isNew) {
        const { data, error } = await supabase.from('products').select('*').eq('id', id).single()
        if (error || !data) { toast.error('Produit introuvable'); router.push('/produits'); return }
        setForm({
          name: data.name || '',
          brand: data.brand || '',
          description: data.description || '',
          material: data.material || '',
          price: data.price?.toString() || '',
          comparePrice: data.compare_price?.toString() || '',
          costPrice: data.cost_price?.toString() || '',
          sku: data.sku || '',
          category_id: data.category_id || '',
          subcategory: data.subcategory || '',
          stock: data.stock?.toString() || '0',
          active: data.active ?? true,
          featured: data.featured ?? false,
          pretAPorter: data.pret_a_porter ?? false,
          // Normalise en texte (la base peut stocker des nombres) + dédoublonne
          sizes: Array.from(new Set((Array.isArray(data.sizes) ? data.sizes : []).map((s: any) => String(s)))),
          colors: Array.from(new Set((Array.isArray(data.colors) ? data.colors : []).map((c: any) => String(c)))),
        })
        setImages(Array.isArray(data.images) ? data.images : [])
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

  function addColor(raw: string) {
    const name = raw.trim().replace(/\s+/g, ' ')
    if (!name) return
    const pretty = name.charAt(0).toUpperCase() + name.slice(1)
    setForm(prev => prev.colors.some(c => c.toLowerCase() === pretty.toLowerCase())
      ? prev
      : { ...prev, colors: [...prev.colors, pretty] })
    setColorInput('')
  }
  function removeColor(name: string) {
    setForm(prev => ({ ...prev, colors: prev.colors.filter(c => c !== name) }))
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setUploadingImage(true)

    const newUrls: string[] = []
    for (const file of files) {
      if (!file.type.startsWith('image/')) { toast.error(`${file.name} n'est pas une image`); continue }
      if (file.size > 5 * 1024 * 1024) { toast.error(`${file.name} dépasse 5 Mo`); continue }

      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const path = `${isNew ? 'new' : id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, {
        cacheControl: '3600', upsert: false, contentType: file.type
      })

      if (error) {
        toast.error(`Erreur upload: ${error.message}`)
        continue
      }

      const { data: { publicUrl } } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path)
      newUrls.push(publicUrl)
    }

    if (newUrls.length) {
      const updated = [...images, ...newUrls]
      setImages(updated)

      // Save immediately if editing existing product
      if (!isNew) {
        await supabase.from('products').update({ images: updated }).eq('id', id)
      }
      toast.success(`${newUrls.length} image(s) ajoutée(s)`)
    }

    setUploadingImage(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function removeImage(url: string) {
    const updated = images.filter(u => u !== url)
    setImages(updated)

    // Extract storage path from URL and delete from bucket
    try {
      const urlObj = new URL(url)
      const pathParts = urlObj.pathname.split(`/object/public/${STORAGE_BUCKET}/`)
      if (pathParts.length > 1) {
        await supabase.storage.from(STORAGE_BUCKET).remove([pathParts[1]])
      }
    } catch {}

    if (!isNew) {
      await supabase.from('products').update({ images: updated }).eq('id', id)
      toast.success('Image supprimée')
    }
  }

  async function handleSave() {
    if (!form.name || !form.price) return toast.error('Nom et prix obligatoires')
    setSaving(true)

    const payload = {
      name: form.name,
      slug: slugify(form.name),
      brand: form.brand.trim(),
      description: form.description,
      material: form.material || null,
      price: parseFloat(form.price),
      compare_price: form.comparePrice ? parseFloat(form.comparePrice) : null,
      cost_price: form.costPrice ? parseFloat(form.costPrice) : null,
      sku: form.sku || null,
      category_id: form.category_id || null,
      subcategory: form.subcategory || null,
      stock: parseInt(form.stock) || 0,
      active: form.active,
      featured: form.featured,
      pret_a_porter: form.pretAPorter,
      sizes: Array.from(new Set(form.sizes.map(s => String(s)))),
      colors: Array.from(new Set(form.colors.map(c => String(c)))),
      images,
    }

    /* Colonnes récentes (scripts 07 / 08). Si l'une n'existe pas encore en
       base, on retire la ou les colonnes fautives et on réessaie. */
    async function saveWithFallback(fn: (p: Record<string, unknown>) => PromiseLike<{ data?: any; error: any }>) {
      const optional = ['subcategory', 'pret_a_porter', 'material']
      let body: Record<string, unknown> = { ...payload }
      let res = await fn(body)
      let guard = 0
      while (res.error && guard++ < optional.length) {
        const msg = String(res.error.message || '')
        const culprit = optional.find(col => msg.includes(col) && col in body)
        if (!culprit) break
        delete body[culprit]
        toast(`« ${culprit} » non enregistré : lance le script SQL correspondant`, { icon: '⚠️' })
        res = await fn(body)
      }
      return res
    }

    if (isNew) {
      const { data: created, error } = await saveWithFallback(p => supabase.from('products').insert(p).select('id').single())
      if (error) { toast.error(`Erreur lors de la création : ${error.message}`); setSaving(false); return }

      // Rename uploaded images from 'new/' to actual product id
      if (images.length > 0 && created?.id) {
        const renamedUrls: string[] = []
        for (const url of images) {
          try {
            const urlObj = new URL(url)
            const pathParts = urlObj.pathname.split(`/object/public/${STORAGE_BUCKET}/`)
            if (pathParts.length > 1 && pathParts[1].startsWith('new/')) {
              const newPath = pathParts[1].replace('new/', `${created.id}/`)
              await supabase.storage.from(STORAGE_BUCKET).move(pathParts[1], newPath)
              const { data: { publicUrl } } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(newPath)
              renamedUrls.push(publicUrl)
            } else {
              renamedUrls.push(url)
            }
          } catch { renamedUrls.push(url) }
        }
        await supabase.from('products').update({ images: renamedUrls }).eq('id', created.id)
      }

      toast.success('Produit créé !')
      router.push('/produits')
    } else {
      const { error } = await saveWithFallback(p => supabase.from('products').update(p).eq('id', id).select('id').single())
      if (error) { toast.error(`Erreur lors de la sauvegarde : ${error.message}`); setSaving(false); return }
      toast.success('Produit mis à jour !')
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Supprimer ce produit ? Cette action est irréversible.')) return

    // Delete all images from storage
    if (images.length > 0) {
      const paths: string[] = []
      for (const url of images) {
        try {
          const urlObj = new URL(url)
          const pathParts = urlObj.pathname.split(`/object/public/${STORAGE_BUCKET}/`)
          if (pathParts.length > 1) paths.push(pathParts[1])
        } catch {}
      }
      if (paths.length) await supabase.storage.from(STORAGE_BUCKET).remove(paths)
    }

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
          {/* Images */}
          <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-6">
            <h2 className="text-white font-semibold text-sm mb-5">Photos du produit</h2>
            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
            <div className="grid grid-cols-4 gap-3 mb-3">
              {images.map((url, i) => (
                <div key={i} className="relative group aspect-square rounded-xl overflow-hidden border border-[#2a2a2a]">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  {i === 0 && (
                    <div className="absolute top-1 left-1 bg-white/90 text-black text-[10px] font-semibold px-1.5 py-0.5 rounded">
                      Principal
                    </div>
                  )}
                  <button onClick={() => removeImage(url)}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <X size={12} />
                  </button>
                </div>
              ))}
              <button onClick={() => fileInputRef.current?.click()} disabled={uploadingImage}
                className="aspect-square rounded-xl border border-dashed border-[#2a2a2a] hover:border-[#444] flex flex-col items-center justify-center gap-2 transition-colors text-zinc-600 hover:text-zinc-400 disabled:opacity-50">
                {uploadingImage
                  ? <Loader2 size={18} className="animate-spin" />
                  : <><ImagePlus size={18} /><span className="text-[10px]">Ajouter</span></>
                }
              </button>
            </div>
            <p className="text-xs text-zinc-600">JPG, PNG, WEBP · Max 5 Mo par image · La première image est l'image principale</p>
          </div>

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
                {newBrandMode ? (
                  <div className="flex gap-2">
                    <input value={form.brand} onChange={e => update('brand', e.target.value)} autoFocus
                      className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white text-sm px-4 py-3 rounded-xl outline-none focus:border-white/30 transition-colors placeholder:text-zinc-600"
                      placeholder="Nom de la nouvelle marque" />
                    <button type="button" onClick={() => { setNewBrandMode(false); update('brand', '') }}
                      className="text-xs text-zinc-500 hover:text-white px-2 flex-shrink-0" title="Revenir à la liste">✕</button>
                  </div>
                ) : (
                  <select
                    value={brandOptions.find(b => b.toLowerCase() === form.brand.trim().toLowerCase()) || form.brand.trim()}
                    onChange={e => {
                      if (e.target.value === '__new__') { setNewBrandMode(true); update('brand', '') }
                      else update('brand', e.target.value)
                    }}
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white text-sm px-4 py-3 rounded-xl outline-none focus:border-white/30 transition-colors cursor-pointer">
                    <option value="">— Sans marque —</option>
                    {brandOptions.map(b => <option key={b} value={b}>{b}</option>)}
                    {form.brand.trim() && !brandOptions.some(b => b.toLowerCase() === form.brand.trim().toLowerCase()) && (
                      <option value={form.brand.trim()}>{form.brand.trim()}</option>
                    )}
                    <option value="__new__">➕ Nouvelle marque…</option>
                  </select>
                )}
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
              <div className="col-span-2">
                <label className="text-xs text-zinc-500 uppercase tracking-wider mb-1.5 block">Matière / Composition</label>
                <input value={form.material} onChange={e => update('material', e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white text-sm px-4 py-3 rounded-xl outline-none focus:border-white/30 transition-colors placeholder:text-zinc-600"
                  placeholder="Ex : Mesh / GEL, 100% Coton 220g…" />
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

          {/* Couleurs */}
          <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-6">
            <h2 className="text-white font-semibold text-sm mb-1">Couleurs disponibles</h2>
            <p className="text-xs text-zinc-600 mb-4">Servent aux filtres et à la fiche produit. Clique un raccourci ou tape une couleur.</p>

            {form.colors.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {form.colors.map(c => (
                  <span key={c} className="inline-flex items-center gap-2 bg-[#1a1a1a] border border-[#2a2a2a] text-white text-sm pl-2 pr-1 py-1.5 rounded-lg">
                    <span className="w-4 h-4 rounded-full border border-white/15" style={{ background: colorHex(c) }} />
                    {c}
                    <button onClick={() => removeColor(c)} className="w-5 h-5 rounded flex items-center justify-center text-zinc-500 hover:text-red-400">
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2 mb-3">
              <input value={colorInput} onChange={e => setColorInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addColor(colorInput) } }}
                placeholder="Ajouter une couleur (ex: Rouge)"
                className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] text-white text-sm px-4 py-2.5 rounded-xl outline-none focus:border-white/30 transition-colors placeholder:text-zinc-600" />
              <button onClick={() => addColor(colorInput)}
                className="flex items-center gap-1.5 text-sm text-zinc-300 bg-[#1a1a1a] border border-[#2a2a2a] px-3 py-2.5 rounded-xl hover:text-white hover:border-[#3a3a3a] transition-all">
                <Plus size={14} />Ajouter
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {COLOR_PRESETS.filter(c => !form.colors.includes(c)).map(c => (
                <button key={c} onClick={() => addColor(c)}
                  className="inline-flex items-center gap-1.5 bg-[#1a1a1a] border border-[#2a2a2a] text-zinc-400 text-xs px-2.5 py-1.5 rounded-lg hover:text-white hover:border-[#3a3a3a] transition-all">
                  <span className="w-3 h-3 rounded-full border border-white/15" style={{ background: colorHex(c) }} />
                  {c}
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

            <div className="flex items-center justify-between mt-5 pt-5 border-t border-[#1e1e1e]">
              <span className="text-sm text-zinc-300">À la une (accueil)</span>
              <button onClick={() => update('featured', !form.featured)}
                className={`relative w-11 h-6 rounded-full transition-colors ${form.featured ? 'bg-white' : 'bg-[#2a2a2a]'}`}>
                <div className={`absolute top-0.5 w-5 h-5 rounded-full transition-transform bg-black ${form.featured ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>
            <p className="text-xs text-zinc-600 mt-2">{form.featured ? 'Affiché dans le slider Best Sellers' : 'Non mis en avant sur l\'accueil'}</p>

            <div className="flex items-center justify-between mt-5 pt-5 border-t border-[#1e1e1e]">
              <span className="text-sm text-zinc-300">Prêt à porter (accueil)</span>
              <button onClick={() => update('pretAPorter', !form.pretAPorter)}
                className={`relative w-11 h-6 rounded-full transition-colors ${form.pretAPorter ? 'bg-white' : 'bg-[#2a2a2a]'}`}>
                <div className={`absolute top-0.5 w-5 h-5 rounded-full transition-transform bg-black ${form.pretAPorter ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>
            <p className="text-xs text-zinc-600 mt-2">{form.pretAPorter ? 'Affiché dans la section « Prêt à porter »' : 'Pas dans la section « Prêt à porter »'}</p>
          </div>

          <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-6">
            <h2 className="text-white font-semibold text-sm mb-5">Catégorie</h2>
            <select value={form.category_id}
              onChange={e => { update('category_id', e.target.value); update('subcategory', '') }}
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white text-sm px-4 py-3 rounded-xl outline-none focus:border-white/30 transition-colors">
              <option value="">Choisir...</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>

            {(() => {
              const selected = categories.find(c => c.id === form.category_id)
              const subs = selected?.subcats || []
              if (!subs.length) return null
              const known = subs.some(s => s.name === form.subcategory)
              return (
                <div className="mt-4">
                  <label className="text-xs text-zinc-500 uppercase tracking-wider mb-1.5 block">Type</label>
                  <select value={form.subcategory} onChange={e => update('subcategory', e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white text-sm px-4 py-3 rounded-xl outline-none focus:border-white/30 transition-colors">
                    <option value="">Aucun (visible dans toute la catégorie)</option>
                    {!known && form.subcategory && <option value={form.subcategory}>{form.subcategory}</option>}
                    {subs.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                  </select>
                  <p className="text-[11px] text-zinc-600 mt-2">Ex : un hoodie → catégorie « Hauts », type « Hoodies »</p>
                </div>
              )
            })()}
          </div>

          <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-6">
            <h2 className="text-white font-semibold text-sm mb-5">Stock</h2>
            <input type="number" value={form.stock} onChange={e => update('stock', e.target.value)} min={0}
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white text-sm px-4 py-3 rounded-xl outline-none focus:border-white/30 transition-colors" />
            {parseInt(form.stock) === 0 && (
              <p className="text-xs text-red-400 mt-2">Produit en rupture de stock</p>
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
