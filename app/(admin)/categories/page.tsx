'use client'
import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, GripVertical, Tag, Loader2 } from 'lucide-react'
import Header from '@/components/Header'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase'
import { slugify } from '@/lib/utils'

type Category = {
  id: string
  name: string
  slug: string
  description: string | null
  active: boolean
  sort_order: number
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ name: '', description: '' })
  const [showNew, setShowNew] = useState(false)
  const [newForm, setNewForm] = useState({ name: '', description: '' })
  const [saving, setSaving] = useState(false)

  const supabase = createClient()

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true })
    if (error) toast.error('Erreur de chargement')
    else setCategories(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function startEdit(cat: Category) {
    setEditing(cat.id)
    setEditForm({ name: cat.name, description: cat.description || '' })
  }

  async function saveEdit(id: string) {
    setSaving(true)
    const { error } = await supabase
      .from('categories')
      .update({ name: editForm.name, description: editForm.description, slug: slugify(editForm.name) })
      .eq('id', id)
    setSaving(false)
    if (error) { toast.error('Erreur lors de la sauvegarde'); return }
    setCategories(prev => prev.map(c => c.id === id ? { ...c, name: editForm.name, description: editForm.description, slug: slugify(editForm.name) } : c))
    setEditing(null)
    toast.success('Catégorie mise à jour')
  }

  async function deleteCategory(id: string) {
    if (!confirm('Supprimer cette catégorie ?')) return
    const { error } = await supabase.from('categories').delete().eq('id', id)
    if (error) { toast.error('Erreur lors de la suppression'); return }
    setCategories(prev => prev.filter(c => c.id !== id))
    toast.success('Catégorie supprimée')
  }

  async function toggleActive(cat: Category) {
    const { error } = await supabase
      .from('categories')
      .update({ active: !cat.active })
      .eq('id', cat.id)
    if (error) { toast.error('Erreur lors de la mise à jour'); return }
    setCategories(prev => prev.map(c => c.id === cat.id ? { ...c, active: !cat.active } : c))
    toast.success('Statut mis à jour')
  }

  async function addCategory() {
    if (!newForm.name) return toast.error('Nom obligatoire')
    setSaving(true)
    const { data, error } = await supabase
      .from('categories')
      .insert({ name: newForm.name, slug: slugify(newForm.name), description: newForm.description, active: true, sort_order: categories.length })
      .select()
      .single()
    setSaving(false)
    if (error) { toast.error('Erreur lors de la création'); return }
    setCategories(prev => [...prev, data])
    setNewForm({ name: '', description: '' })
    setShowNew(false)
    toast.success('Catégorie créée')
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
                <div className="grid grid-cols-2 gap-3">
                  <input value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
                    className="bg-[#1a1a1a] border border-[#2a2a2a] text-white text-sm px-4 py-2.5 rounded-xl outline-none focus:border-white/30" />
                  <input value={editForm.description} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))}
                    className="bg-[#1a1a1a] border border-[#2a2a2a] text-white text-sm px-4 py-2.5 rounded-xl outline-none focus:border-white/30" />
                  <div className="col-span-2 flex gap-2">
                    <button onClick={() => saveEdit(cat.id)} disabled={saving}
                      className="bg-white text-black text-xs font-semibold px-4 py-2 rounded-lg disabled:opacity-50 flex items-center gap-1.5">
                      {saving && <Loader2 size={11} className="animate-spin" />}Enregistrer
                    </button>
                    <button onClick={() => setEditing(null)} className="text-xs text-zinc-500 hover:text-white px-4 py-2 transition-colors">Annuler</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <GripVertical size={16} className="text-zinc-700 cursor-grab" />
                    <div className="w-9 h-9 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center">
                      <Tag size={15} className="text-zinc-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-white">{cat.name}</p>
                        <span className="text-[10px] text-zinc-600 font-mono">/{cat.slug}</span>
                        {!cat.active && <span className="text-[10px] text-zinc-500 px-1.5 py-0.5 bg-[#1e1e1e] rounded">Inactif</span>}
                      </div>
                      <p className="text-xs text-zinc-500 mt-0.5">{cat.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => toggleActive(cat)}
                      className={`relative w-9 h-5 rounded-full transition-colors ${cat.active ? 'bg-white' : 'bg-[#2a2a2a]'}`}>
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-black transition-transform ${cat.active ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </button>
                    <button onClick={() => startEdit(cat)}
                      className="w-8 h-8 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-zinc-400 hover:text-white hover:border-[#333] transition-all">
                      <Edit2 size={13} />
                    </button>
                    <button onClick={() => deleteCategory(cat.id)}
                      className="w-8 h-8 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-zinc-400 hover:text-red-400 hover:border-red-400/30 transition-all">
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
