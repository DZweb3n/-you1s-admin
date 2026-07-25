'use client'
import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Tag, Loader2, X, ChevronUp, ChevronDown, Check } from 'lucide-react'
import Header from '@/components/Header'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase'
import { slugify } from '@/lib/utils'

/* Une sous-catégorie = juste un nom. Le champ image est conservé à null
   pour rester compatible avec les données existantes (le site vitrine ne
   lit que le nom), mais il n'est plus éditable — le menu est typographique. */
type Subcat = { name: string; image: string | null }

type Category = {
  id: string
  name: string
  slug: string
  description: string | null
  active: boolean
  sort_order: number
  subcats: Subcat[]
}

function normalizeSubcats(raw: unknown): Subcat[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((s): s is Record<string, unknown> => !!s && typeof s === 'object')
    .map(s => ({ name: String(s.name ?? ''), image: s.image ? String(s.image) : null }))
    .filter(s => s.name.length > 0)
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<{ name: string; description: string; subcats: Subcat[] }>({ name: '', description: '', subcats: [] })
  const [newSubcat, setNewSubcat] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [newForm, setNewForm] = useState({ name: '', description: '' })
  const [saving, setSaving] = useState(false)
  const [subcatsSupported, setSubcatsSupported] = useState(true)

  const supabase = createClient()

  async function load() {
    setLoading(true)
    // On tente avec subcats ; si la colonne n'existe pas encore (script 06 non lancé), on retombe sans
    let { data, error } = await supabase
      .from('categories')
      .select('id, name, slug, description, active, sort_order, subcats')
      .order('sort_order', { ascending: true })
    if (error) {
      setSubcatsSupported(false)
      const retry = await supabase
        .from('categories')
        .select('id, name, slug, description, active, sort_order')
        .order('sort_order', { ascending: true })
      data = retry.data as any
      error = retry.error
    }
    if (error) toast.error(`Erreur de chargement : ${error.message}`)
    else setCategories((data || []).map((c: any) => ({ ...c, subcats: normalizeSubcats(c.subcats) })))
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function startEdit(cat: Category) {
    setEditing(cat.id)
    setNewSubcat('')
    setEditForm({ name: cat.name, description: cat.description || '', subcats: cat.subcats.map(s => ({ ...s })) })
  }

  /* ── Le slug ne change JAMAIS lors d'une modification : le site identifie
     les catégories par leur slug (URLs, filtres, menu). ── */
  async function saveEdit(cat: Category) {
    if (!editForm.name.trim()) return toast.error('Le nom est obligatoire')
    setSaving(true)
    const payload: Record<string, unknown> = {
      name: editForm.name.trim(),
      description: editForm.description.trim(),
    }
    if (subcatsSupported) payload.subcats = editForm.subcats
    const { error } = await supabase.from('categories').update(payload).eq('id', cat.id)
    setSaving(false)
    if (error) {
      toast.error(`Échec de l'enregistrement : ${error.message}`)
      return
    }
    setCategories(prev => prev.map(c => c.id === cat.id
      ? { ...c, name: editForm.name.trim(), description: editForm.description.trim(), subcats: editForm.subcats }
      : c))
    setEditing(null)
    toast.success('Catégorie mise à jour')
  }

  async function deleteCategory(cat: Category) {
    if (!confirm(`Supprimer « ${cat.name} » ?\n\nLes produits de cette catégorie ne seront PAS supprimés, mais ils n'apparaîtront plus dans les filtres de catégorie du site tant qu'on ne leur en attribue pas une nouvelle.`)) return
    const { error } = await supabase.from('categories').delete().eq('id', cat.id)
    if (error) return toast.error(`Erreur lors de la suppression : ${error.message}`)
    setCategories(prev => prev.filter(c => c.id !== cat.id))
    toast.success('Catégorie supprimée')
  }

  async function toggleActive(cat: Category) {
    const { error } = await supabase.from('categories').update({ active: !cat.active }).eq('id', cat.id)
    if (error) return toast.error(`Erreur : ${error.message}`)
    setCategories(prev => prev.map(c => c.id === cat.id ? { ...c, active: !cat.active } : c))
    toast.success('Statut mis à jour')
  }

  async function addCategory() {
    if (!newForm.name.trim()) return toast.error('Nom obligatoire')
    setSaving(true)
    const { data, error } = await supabase
      .from('categories')
      .insert({ name: newForm.name.trim(), slug: slugify(newForm.name), description: newForm.description.trim(), active: true, sort_order: categories.length })
      .select()
      .single()
    setSaving(false)
    if (error) {
      const msg = error.message.includes('duplicate') ? 'Une catégorie avec ce nom (slug) existe déjà' : error.message
      return toast.error(`Erreur lors de la création : ${msg}`)
    }
    setCategories(prev => [...prev, { ...data, subcats: normalizeSubcats((data as any).subcats) }])
    setNewForm({ name: '', description: '' })
    setShowNew(false)
    toast.success('Catégorie créée')
  }

  /* ── Sous-catégories (dans le formulaire d'édition, sauvées avec Enregistrer) ── */
  function addSubcat() {
    const name = newSubcat.trim()
    if (!name) return
    if (editForm.subcats.some(s => s.name.toLowerCase() === name.toLowerCase())) return toast.error('Cette sous-catégorie existe déjà')
    setEditForm(p => ({ ...p, subcats: [...p.subcats, { name, image: null }] }))
    setNewSubcat('')
  }
  function renameSubcat(idx: number, name: string) {
    setEditForm(p => ({ ...p, subcats: p.subcats.map((s, i) => i === idx ? { ...s, name } : s) }))
  }
  function removeSubcat(idx: number) {
    setEditForm(p => ({ ...p, subcats: p.subcats.filter((_, i) => i !== idx) }))
  }
  function moveSubcat(idx: number, dir: -1 | 1) {
    setEditForm(p => {
      const arr = [...p.subcats]
      const j = idx + dir
      if (j < 0 || j >= arr.length) return p
      ;[arr[idx], arr[j]] = [arr[j], arr[idx]]
      return { ...p, subcats: arr }
    })
  }

  return (
    <div>
      <Header
        title="Catégories"
        subtitle={`${categories.length} catégories`}
        action={
          <button onClick={() => setShowNew(!showNew)}
            className="flex items-center gap-2 bg-white text-black text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-zinc-200 transition-colors font-display tracking-wide">
            <Plus size={15} />Nouvelle catégorie
          </button>
        }
      />

      {!subcatsSupported && (
        <div className="bg-yellow-400/10 border border-yellow-400/20 text-yellow-300 text-xs rounded-xl px-4 py-3 mb-5">
          Les sous-catégories ne sont pas encore activées en base : lance le script <span className="font-mono">06-categories-subcats.sql</span> dans Supabase → SQL Editor.
        </div>
      )}

      {showNew && (
        <div className="bg-[#111] border border-white/10 rounded-2xl p-6 mb-5">
          <h3 className="text-white font-semibold text-sm mb-4">Nouvelle catégorie</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs text-zinc-500 uppercase tracking-wider mb-1.5 block">Nom *</label>
              <input value={newForm.name} onChange={e => setNewForm(p => ({ ...p, name: e.target.value }))}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white text-sm px-4 py-3 rounded-xl outline-none focus:border-white/30"
                placeholder="Ex: Accessoires" />
            </div>
            <div>
              <label className="text-xs text-zinc-500 uppercase tracking-wider mb-1.5 block">Description</label>
              <input value={newForm.description} onChange={e => setNewForm(p => ({ ...p, description: e.target.value }))}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white text-sm px-4 py-3 rounded-xl outline-none focus:border-white/30"
                placeholder="Description courte" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={addCategory} disabled={saving}
              className="bg-white text-black text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-zinc-200 transition-colors disabled:opacity-50 flex items-center gap-2">
              {saving && <Loader2 size={13} className="animate-spin" />}Créer
            </button>
            <button onClick={() => setShowNew(false)} className="text-sm text-zinc-500 hover:text-white px-5 py-2.5 transition-colors">Annuler</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={20} className="animate-spin text-zinc-500" />
        </div>
      ) : categories.length === 0 ? (
        <div className="text-center py-20 text-zinc-500">
          <Tag size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Aucune catégorie. Créez-en une ci-dessus.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {categories.map(cat => (
            <div key={cat.id} className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-5 hover:border-[#2a2a2a] transition-colors">
              {editing === cat.id ? (
                /* ─────────── MODE ÉDITION ─────────── */
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-zinc-500 uppercase tracking-wider mb-1.5 block">Nom</label>
                      <input value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
                        className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white text-sm px-4 py-2.5 rounded-xl outline-none focus:border-white/30" />
                      <p className="text-[10px] text-zinc-600 mt-1.5 font-mono">/{cat.slug} <span className="font-sans">(identifiant technique — ne change pas, les liens du site restent valides)</span></p>
                    </div>
                    <div>
                      <label className="text-xs text-zinc-500 uppercase tracking-wider mb-1.5 block">Description</label>
                      <input value={editForm.description} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))}
                        className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white text-sm px-4 py-2.5 rounded-xl outline-none focus:border-white/30" />
                    </div>
                  </div>

                  {/* Sous-catégories — nom + réordonner + supprimer (plus d'image) */}
                  {subcatsSupported && (
                    <div>
                      <label className="text-xs text-zinc-500 uppercase tracking-wider mb-2 block">Sous-catégories</label>
                      <div className="space-y-2">
                        {editForm.subcats.map((s, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <span className="w-6 text-center text-[11px] text-zinc-600 flex-shrink-0">{i + 1}</span>
                            <input value={s.name} onChange={e => renameSubcat(i, e.target.value)}
                              className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] text-white text-sm px-3 py-2 rounded-lg outline-none focus:border-white/30" />
                            <button onClick={() => moveSubcat(i, -1)} disabled={i === 0}
                              className="w-8 h-8 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-zinc-400 hover:text-white disabled:opacity-30 transition-all" title="Monter">
                              <ChevronUp size={13} />
                            </button>
                            <button onClick={() => moveSubcat(i, 1)} disabled={i === editForm.subcats.length - 1}
                              className="w-8 h-8 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-zinc-400 hover:text-white disabled:opacity-30 transition-all" title="Descendre">
                              <ChevronDown size={13} />
                            </button>
                            <button onClick={() => removeSubcat(i)}
                              className="w-8 h-8 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-zinc-400 hover:text-red-400 transition-all" title="Supprimer">
                              <X size={13} />
                            </button>
                          </div>
                        ))}
                        <div className="flex items-center gap-2">
                          <input value={newSubcat} onChange={e => setNewSubcat(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSubcat() } }}
                            placeholder="Nouvelle sous-catégorie..."
                            className="flex-1 bg-[#1a1a1a] border border-dashed border-[#2a2a2a] text-white text-sm px-3 py-2 rounded-lg outline-none focus:border-white/30 placeholder:text-zinc-600" />
                          <button onClick={addSubcat}
                            className="flex items-center gap-1.5 text-xs text-zinc-300 bg-[#1a1a1a] border border-[#2a2a2a] px-3 py-2 rounded-lg hover:text-white hover:border-[#3a3a3a] transition-all">
                            <Plus size={12} />Ajouter
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button onClick={() => saveEdit(cat)} disabled={saving}
                      className="bg-white text-black text-xs font-semibold px-4 py-2 rounded-lg disabled:opacity-50 flex items-center gap-1.5">
                      {saving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}Enregistrer
                    </button>
                    <button onClick={() => setEditing(null)} className="text-xs text-zinc-500 hover:text-white px-4 py-2 transition-colors">Annuler</button>
                  </div>
                </div>
              ) : (
                /* ─────────── MODE AFFICHAGE ─────────── */
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-11 h-11 rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] flex items-center justify-center flex-shrink-0">
                      <Tag size={15} className="text-zinc-500" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-white">{cat.name}</p>
                        <span className="text-[10px] text-zinc-600 font-mono">/{cat.slug}</span>
                        {!cat.active && <span className="text-[10px] text-zinc-500 px-1.5 py-0.5 bg-[#1e1e1e] rounded">Inactif</span>}
                      </div>
                      {cat.description && <p className="text-xs text-zinc-500 mt-0.5 truncate">{cat.description}</p>}
                      {cat.subcats.length > 0 && (
                        <p className="text-[11px] text-zinc-600 mt-1 truncate">
                          {cat.subcats.map(s => s.name).join(' · ')}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => toggleActive(cat)}
                      className={`relative w-9 h-5 rounded-full transition-colors ${cat.active ? 'bg-white' : 'bg-[#2a2a2a]'}`}
                      title={cat.active ? 'Visible sur le site' : 'Masquée'}>
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-black transition-transform ${cat.active ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </button>
                    <button onClick={() => startEdit(cat)}
                      className="w-8 h-8 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-zinc-400 hover:text-white hover:border-[#333] transition-all" title="Modifier">
                      <Edit2 size={13} />
                    </button>
                    <button onClick={() => deleteCategory(cat)}
                      className="w-8 h-8 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-zinc-400 hover:text-red-400 hover:border-red-400/30 transition-all" title="Supprimer">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
