'use client'
import { useState, useEffect } from 'react'
import { Plus, Trash2, Award, Loader2, Upload, X, ChevronUp, ChevronDown } from 'lucide-react'
import Header from '@/components/Header'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase'

const STORAGE_BUCKET = 'products'

/* Une ligne de la liste = une marque.
   - id !== null  → enregistrée dans la table `brands` (logo, ordre, actif éditables)
   - id === null  → détectée uniquement depuis les produits (pas encore de logo) */
type Row = {
  id: string | null
  name: string
  logo_url: string | null
  active: boolean
  sort_order: number
  count: number   // nombre de produits qui portent cette marque
}

const norm = (s: unknown) => String(s ?? '').trim().toLowerCase()

export default function MarquesPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState<string | null>(null)
  const [newName, setNewName] = useState('')

  const supabase = createClient()

  /* Fusionne la table `brands` (logos) ET les marques réellement utilisées
     par les produits → toute marque posée sur un produit apparaît ici. */
  async function load() {
    setLoading(true)
    const [{ data: brandRows, error: bErr }, { data: prodRows, error: pErr }] = await Promise.all([
      supabase.from('brands').select('id, name, logo_url, sort_order, active').order('sort_order', { ascending: true }),
      supabase.from('products').select('brand'),
    ])
    if (bErr) toast.error(`Erreur marques : ${bErr.message}`)
    if (pErr) toast.error(`Erreur produits : ${pErr.message}`)

    const map = new Map<string, Row>()
    ;(brandRows || []).forEach((b: any) => {
      map.set(norm(b.name), { id: b.id, name: b.name, logo_url: b.logo_url, active: b.active, sort_order: b.sort_order, count: 0 })
    })
    ;(prodRows || []).forEach((p: any) => {
      const k = norm(p.brand)
      if (!k) return
      const existing = map.get(k)
      if (existing) existing.count++
      else map.set(k, { id: null, name: String(p.brand).trim(), logo_url: null, active: true, sort_order: 9999, count: 1 })
    })

    const list = Array.from(map.values()).sort((a, b) => {
      // enregistrées d'abord (par ordre), puis détectées (alphabétique)
      if (a.id && !b.id) return -1
      if (!a.id && b.id) return 1
      if (a.id && b.id) return a.sort_order - b.sort_order
      return a.name.localeCompare(b.name, 'fr')
    })
    setRows(list)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  /* Enregistre une marque dans la table `brands` (avec ou sans logo).
     Utilisé pour « détectée → enregistrée » et pour l'ajout manuel. */
  async function registerBrand(name: string, logo_url: string | null): Promise<boolean> {
    const registeredCount = rows.filter(r => r.id).length
    const { error } = await supabase.from('brands').insert({ name: name.trim(), logo_url, sort_order: registeredCount, active: true })
    if (error) { toast.error(`Erreur : ${error.message}`); return false }
    await load()
    return true
  }

  async function addBrand() {
    const name = newName.trim()
    if (!name) return toast.error('Nom obligatoire')
    if (rows.some(r => norm(r.name) === norm(name) && r.id)) return toast.error('Cette marque est déjà enregistrée')
    setSaving(true)
    const ok = await registerBrand(name, null)
    setSaving(false)
    if (ok) { setNewName(''); toast.success('Marque ajoutée — associe-lui un logo si tu en as un') }
  }

  /* Upload d'un logo. Si la marque n'est pas encore enregistrée (détectée),
     on l'enregistre au passage avec ce logo. */
  async function uploadLogo(row: Row, file: File) {
    if (!file.type.startsWith('image/')) return toast.error("Ce fichier n'est pas une image")
    if (file.size > 2 * 1024 * 1024) return toast.error('Logo trop lourd (max 2 Mo)')
    setUploading(row.name)
    const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
    const path = `brands/${norm(row.name).replace(/[^a-z0-9]+/g, '-')}-${Date.now()}.${ext}`
    const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type })
    if (error) { setUploading(null); return toast.error(`Erreur upload : ${error.message}`) }
    const { data: { publicUrl } } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path)
    if (row.id) {
      const { error: upErr } = await supabase.from('brands').update({ logo_url: publicUrl }).eq('id', row.id)
      setUploading(null)
      if (upErr) return toast.error(`Erreur de sauvegarde : ${upErr.message}`)
      setRows(prev => prev.map(r => r.id === row.id ? { ...r, logo_url: publicUrl } : r))
      toast.success('Logo mis à jour')
    } else {
      setUploading(null)
      const ok = await registerBrand(row.name, publicUrl)
      if (ok) toast.success('Logo ajouté — marque enregistrée')
    }
  }

  async function removeLogo(row: Row) {
    if (!row.id) return
    const { error } = await supabase.from('brands').update({ logo_url: null }).eq('id', row.id)
    if (error) return toast.error(`Erreur : ${error.message}`)
    setRows(prev => prev.map(r => r.id === row.id ? { ...r, logo_url: null } : r))
    toast.success("Logo retiré (le nom s'affiche en texte)")
  }

  async function toggleActive(row: Row) {
    if (!row.id) return
    const { error } = await supabase.from('brands').update({ active: !row.active }).eq('id', row.id)
    if (error) return toast.error(`Erreur : ${error.message}`)
    setRows(prev => prev.map(r => r.id === row.id ? { ...r, active: !r.active } : r))
    toast.success('Statut mis à jour')
  }

  /* Supprime l'entrée `brands` (logo) — la marque reste détectée via les produits. */
  async function deleteBrand(row: Row) {
    if (!row.id) return
    if (!confirm(`Retirer le logo/l'enregistrement de « ${row.name} » ?\n\nSes produits ne sont pas touchés : la marque restera affichée en texte et réapparaîtra ici comme « détectée ».`)) return
    const { error } = await supabase.from('brands').delete().eq('id', row.id)
    if (error) return toast.error(`Erreur : ${error.message}`)
    await load()
    toast.success('Enregistrement supprimé')
  }

  async function move(idx: number, dir: -1 | 1) {
    const registered = rows.filter(r => r.id)
    const rIdx = registered.findIndex(r => r === rows[idx])
    const j = rIdx + dir
    if (rIdx < 0 || j < 0 || j >= registered.length) return
    ;[registered[rIdx], registered[j]] = [registered[j], registered[rIdx]]
    // Persiste le nouvel ordre des marques enregistrées
    const updates = registered.map((b, i) => supabase.from('brands').update({ sort_order: i }).eq('id', b.id as string))
    const results = await Promise.all(updates)
    const failed = results.find(r => r.error)
    if (failed?.error) return toast.error(`Erreur d'ordre : ${failed.error.message}`)
    await load()
  }

  const detectedCount = rows.filter(r => !r.id).length

  return (
    <div>
      <Header
        title="Marques"
        subtitle={`${rows.length} marque${rows.length > 1 ? 's' : ''} · ${detectedCount} sans logo`}
      />

      <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl px-5 py-4 mb-5">
        <p className="text-xs text-zinc-500 leading-relaxed">
          💡 Toutes les marques posées sur tes <span className="text-zinc-300">produits</span> apparaissent ici automatiquement.
          Celles marquées <span className="text-zinc-300">« Détectée »</span> n'ont pas encore de logo — ajoute-leur en un et elles s'affichent en image sur le site (mega menu, carrousel). Sinon, le nom reste en texte.
        </p>
      </div>

      {/* Ajout manuel (facultatif — utile pour préparer un logo avant d'avoir le produit) */}
      <div className="flex items-center gap-2 mb-5">
        <input value={newName} onChange={e => setNewName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addBrand() } }}
          placeholder="Ajouter une marque manuellement (ex: Nike)"
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
      ) : rows.length === 0 ? (
        <div className="text-center py-20 text-zinc-500">
          <Award size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Aucune marque. Ajoute une marque à un produit ou crée-en une ci-dessus.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row, i) => (
            <div key={(row.id || 'x') + row.name} className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-5 hover:border-[#2a2a2a] transition-colors">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-20 h-12 rounded-xl overflow-hidden border border-[#2a2a2a] bg-white flex items-center justify-center flex-shrink-0 px-2">
                    {row.logo_url
                      ? <img src={row.logo_url} alt={row.name} className="max-w-full max-h-full object-contain" />
                      : <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider truncate">{row.name}</span>}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-white truncate">{row.name}</p>
                      {!row.id && <span className="text-[10px] text-amber-300/80 px-1.5 py-0.5 bg-amber-400/10 border border-amber-400/15 rounded">Détectée</span>}
                      {row.id && !row.active && <span className="text-[10px] text-zinc-500 px-1.5 py-0.5 bg-[#1e1e1e] rounded">Inactif</span>}
                    </div>
                    <p className="text-xs text-zinc-600 mt-0.5">
                      {row.count > 0 ? `${row.count} produit${row.count > 1 ? 's' : ''}` : 'Aucun produit'}
                      {row.logo_url ? ' · logo défini' : ' · pas de logo'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <label className={`flex items-center gap-1.5 text-xs text-zinc-300 bg-[#1a1a1a] border border-[#2a2a2a] px-3 py-2 rounded-lg hover:text-white hover:border-[#3a3a3a] cursor-pointer transition-all ${uploading === row.name ? 'opacity-50 pointer-events-none' : ''}`}>
                    {uploading === row.name ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                    Logo
                    <input type="file" accept="image/*" className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) uploadLogo(row, f); e.currentTarget.value = '' }} />
                  </label>
                  {row.logo_url && (
                    <button onClick={() => removeLogo(row)}
                      className="w-8 h-8 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-zinc-400 hover:text-red-400 transition-all" title="Retirer le logo">
                      <X size={13} />
                    </button>
                  )}
                  {row.id && (
                    <>
                      <button onClick={() => move(i, -1)} disabled={i === 0 || !rows[i - 1]?.id}
                        className="w-8 h-8 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-zinc-400 hover:text-white disabled:opacity-30 transition-all" title="Monter">
                        <ChevronUp size={13} />
                      </button>
                      <button onClick={() => move(i, 1)} disabled={!rows[i + 1]?.id}
                        className="w-8 h-8 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-zinc-400 hover:text-white disabled:opacity-30 transition-all" title="Descendre">
                        <ChevronDown size={13} />
                      </button>
                      <button onClick={() => toggleActive(row)}
                        className={`relative w-9 h-5 rounded-full transition-colors ${row.active ? 'bg-white' : 'bg-[#2a2a2a]'}`} title={row.active ? 'Logo visible sur le site' : 'Logo masqué'}>
                        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-black transition-transform ${row.active ? 'translate-x-4' : 'translate-x-0.5'}`} />
                      </button>
                      <button onClick={() => deleteBrand(row)}
                        className="w-8 h-8 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-zinc-400 hover:text-red-400 hover:border-red-400/30 transition-all" title="Retirer le logo/l'enregistrement">
                        <Trash2 size={13} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
