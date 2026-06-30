'use client'
import { useState } from 'react'
import { Plus, Edit2, Trash2, GripVertical, Tag } from 'lucide-react'
import Header from '@/components/Header'
import toast from 'react-hot-toast'

const INIT_CATEGORIES = [
  { id: '1', name: 'Sneakers', slug: 'sneakers', description: 'Toutes nos sneakers premium', products: 12, active: true },
  { id: '2', name: 'Hauts', slug: 'hauts', description: 'T-shirts, sweats et vestes', products: 8, active: true },
  { id: '3', name: 'Bas', slug: 'bas', description: 'Pantalons et shorts', products: 5, active: true },
  { id: '4', name: 'Accessoires', slug: 'accessoires', description: 'Casquettes, sacs et plus', products: 3, active: false },
]

export default function CategoriesPage() {
  const [categories, setCategories] = useState(INIT_CATEGORIES)
  const [editing, setEditing] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ name: '', description: '' })
  const [showNew, setShowNew] = useState(false)
  const [newForm, setNewForm] = useState({ name: '', description: '' })

  function startEdit(cat: typeof INIT_CATEGORIES[0]) {
    setEditing(cat.id)
    setEditForm({ name: cat.name, description: cat.description })
  }

  function saveEdit(id: string) {
    setCategories(prev => prev.map(c => c.id === id ? { ...c, ...editForm } : c))
    setEditing(null)
    toast.success('Catégorie mise à jour')
  }

  function deleteCategory(id: string) {
    if (!confirm('Supprimer cette catégorie ?')) return
    setCategories(prev => prev.filter(c => c.id !== id))
    toast.success('Catégorie supprimée')
  }

  function toggleActive(id: string) {
    setCategories(prev => prev.map(c => c.id === id ? { ...c, active: !c.active } : c))
    toast.success('Statut mis à jour')
  }

  function addCategory() {
    if (!newForm.name) return toast.error('Nom obligatoire')
    setCategories(prev => [...prev, {
      id: Date.now().toString(), name: newForm.name, slug: newForm.name.toLowerCase().replace(/\s+/g, '-'),
      description: newForm.description, products: 0, active: true
    }])
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
            <button onClick={addCategory} className="bg-white text-black text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-zinc-200 transition-colors">Créer</button>
            <button onClick={() => setShowNew(false)} className="text-sm text-zinc-500 hover:text-white px-5 py-2.5 transition-colors">Annuler</button>
          </div>
        </div>
      )}

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
                  <button onClick={() => saveEdit(cat.id)} className="bg-white text-black text-xs font-semibold px-4 py-2 rounded-lg">Enregistrer</button>
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
                  <span className="text-xs text-zinc-500">{cat.products} produits</span>
                  <button onClick={() => toggleActive(cat.id)}
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
    </div>
  )
}
