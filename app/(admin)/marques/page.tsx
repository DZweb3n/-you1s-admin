'use client'
import { useState, useEffect } from 'react'
import { Plus, Trash2, Award, Loader2, Upload, X, ChevronUp, ChevronDown } from 'lucide-react'
import Header from '@/components/Header'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase'

const STORAGE_BUCKET = 'products'

type Brand = {
  id: string
  name: string
  logo_url: string | null
  sort_order: number
  active: boolean
}

export default function MarquesPage() {
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState<string | null>(null)
  const [newName, setNewName] = useState('')

  const supabase = createClient()

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('brands')
      .select('id, name, logo_url, sort_order, active')
      .order('sort_order', { ascending: true })
    if (error) toast.error(`Erreur de chargement : ${error.message}`)
    else setBrands(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function addBrand() {
    const name = newName.trim()
    if (!name) return toast.error('Nom obligatoire')
    if (brands.some(b => b.name.toLowerCase() === name.toLowerCase())) return toast.error('Cette marque existe déjà')
    setSaving(true)
    const { data, error } = await supabase
      .from('brands')
      .insert({ name, sort_order: brands.length, active: true })
      .select()
      .single()
    setSaving(false)
    if (error) return toast.error(`Erreur : ${error.message}`)
    setBrands(prev => [...prev, data])
    setNewName('')
    toast.success('Marque créée — ajoute son logo si tu en as un')
  }

  async function uploadLogo(brand: Brand, file: File) {
    if (!file.type.startsWith('image/')) return toast.error("Ce fichier n'est pas une image")
    if (file.size > 2 * 1024 * 1024) return toast.error('Logo trop lourd (max 2 Mo)')
    setUploading(brand.id)
    const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
    const path = `brands/${brand.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}.${ext}`
    const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type })
    if (error) { setUploading(null); return toast.error(`Erreur upload : ${error.message}`) }
    const { data: { publicUrl } } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path)
    const { error: upErr } = await supabase.from('brands').update({ logo_url: publicUrl }).eq('id', brand.id)
    setUploading(null)
    if (upErr) return toast.error(`Erreur de sauvegarde : ${upErr.message}`)
    setBrands(prev => prev.map(b => b.id === brand.id ? { ...b, logo_url: publicUrl } : b))
    toast.success('Logo mis à jour')
  }

  async function removeLogo(brand: Brand) {
    const { error } = await supabase.from('brands').update({ logo_url: null }).eq('id', brand.id)
    if (error) return toast.error(`Erreur : ${error.message}`)
    setBrands(prev => prev.map(b => b.id === brand.id ? { ...b, logo_url: null } : b))
    toast.success('Logo retiré (le nom s\'affichera en texte)')
  }

  async function toggleActive(brand: Brand) {
    const { error } = await supabase.from('brands').update({ active: !brand.active }).eq('id', brand.id)
    if (error) return toast.error(`Erreur : ${error.message}`)
    setBrands(prev => prev.map(b => b.id === brand.id ? { ...b, active: !b.active } : b))
    toast.success('Statut mis à jour')
  }

  async function deleteBrand(brand: Brand) {
    if (!confirm(`Supprimer la marque « ${brand.name} » ?\n\nSes produits ne seront pas supprimés — seul son logo disparaîtra du site (le nom restera affiché en texte).`)) return
    const { error } = await supabase.from('brands').delete().eq('id', brand.id)
    if (error) return toast.error(`Erreur : ${error.message}`)
    setBrands(prev => prev.filter(b => b.id !== brand.id))
    toast.success('Marque supprimée')
  }

  async function move(idx: number, dir: -1 | 1) {
    const j = idx + dir
    if (j < 0 || j >= brands.length) return
    const arr = [...brands]
    ;[arr[idx], arr[j]] = [arr[j], arr[idx]]
    setBrands(arr)
    // Persiste l'ordre
    const updates = arr.map((b, i) => supabase.from('brands').update({ sort_order: i }).eq('id', b.id))
    const results = await Promise.all(updates)
    const failed = results.find(r => r.error)
    if (failed?.error) toast.error(`Erreur d'ordre : ${failed.error.message}`)
  }

  return (
    <div>
      <Header
        title="Marques"
        subtitle="Les logos affichés sur le site — les marques elles-mêmes viennent de tes produits"
      />

      <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl px-5 py-4 mb-5">
        <p className="text-xs text-zinc-500 leading-relaxed">
          💡 Les marques visibles sur le site (mega menu, pages catégorie) sont <span className="text-zinc-300">détectées automatiquement depuis tes produits</span> (champ « Marque » de chaque produit).
          Cette page sert à leur associer un <span className="text-zinc-300">logo</span> : si une marque de produit porte le même nom qu'une marque ci-dessous, son logo s'affiche à la place du texte.
        </p>
      </div>

      {/* Ajout */}
      <div className="flex items-center gap-2 mb-5">
        <input value={newName} onChange={e => setNewName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addBrand() } }}
          placeholder="Nom de la marque (ex: Nike)"
          className="flex-1 max-w-sm bg-[#111] border border-[#222] text-white text-sm px-4 py-2.5 rounded-xl outline-none focus:border-[#333] transition-colors placeholder:text-zinc-600" />
        <button onClick={addBrand} disabled={saving}
          className="flex items-center gap-2 bg-white text-black text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-zinc-200 transition-colors disabled:opacity-50 font-display tracking-wide">
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}Ajouter
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={20} className="animate-spin text-zinc-500" />
        </div>
      ) : brands.length === 0 ? (
        <div className="text-center py-20 text-zinc-500">
          <Award size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Aucune marque. Ajoute-en une ci-dessus.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {brands.map((brand, i) => (
            <div key={brand.id} className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-5 hover:border-[#2a2a2a] transition-colors">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-20 h-12 rounded-xl overflow-hidden border border-[#2a2a2a] bg-white flex items-center justify-center flex-shrink-0 px-2">
                    {brand.logo_url
                      ? <img src={brand.logo_url} alt={brand.name} className="max-w-full max-h-full object-contain" />
                      : <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider truncate">{brand.name}</span>}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-white truncate">{brand.name}</p>
                      {!brand.active && <span className="text-[10px] text-zinc-500 px-1.5 py-0.5 bg-[#1e1e1e] rounded">Inactif</span>}
                    </div>
                    <p className="text-xs text-zinc-600 mt-0.5">{brand.logo_url ? 'Logo défini' : 'Pas de logo — le nom s\'affiche en texte'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <label className={`flex items-center gap-1.5 text-xs text-zinc-300 bg-[#1a1a1a] border border-[#2a2a2a] px-3 py-2 rounded-lg hover:text-white hover:border-[#3a3a3a] cursor-pointer transition-all ${uploading === brand.id ? 'opacity-50 pointer-events-none' : ''}`}>
                    {uploading === brand.id ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                    Logo
                    <input type="file" accept="image/*" className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) uploadLogo(brand, f); e.currentTarget.value = '' }} />
                  </label>
                  {brand.logo_url && (
                    <button onClick={() => removeLogo(brand)}
                      className="w-8 h-8 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-zinc-400 hover:text-red-400 transition-all" title="Retirer le logo">
                      <X size={13} />
                    </button>
                  )}
                  <button onClick={() => move(i, -1)} disabled={i === 0}
                    className="w-8 h-8 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-zinc-400 hover:text-white disabled:opacity-30 transition-all" title="Monter">
                    <ChevronUp size={13} />
                  </button>
                  <button onClick={() => move(i, 1)} disabled={i === brands.length - 1}
                    className="w-8 h-8 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-zinc-400 hover:text-white disabled:opacity-30 transition-all" title="Descendre">
                    <ChevronDown size={13} />
                  </button>
                  <button onClick={() => toggleActive(brand)}
                    className={`relative w-9 h-5 rounded-full transition-colors ${brand.active ? 'bg-white' : 'bg-[#2a2a2a]'}`}>
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-black transition-transform ${brand.active ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </button>
                  <button onClick={() => deleteBrand(brand)}
                    className="w-8 h-8 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-zinc-400 hover:text-red-400 hover:border-red-400/30 transition-all">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
