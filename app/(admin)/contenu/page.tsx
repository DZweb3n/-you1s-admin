'use client'
import { useState, useEffect } from 'react'
import { Save, Loader2, Upload, ImageIcon } from 'lucide-react'
import Header from '@/components/Header'
import { createClient } from '@/lib/supabase'
import toast from 'react-hot-toast'

const STORAGE_BUCKET = 'products'

type ContentItem = {
  key: string
  label: string
  section: string
  type: string
  value: string
}

export default function ContenuPage() {
  const [items, setItems] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [uploading, setUploading] = useState<string | null>(null)
  const supabase = createClient()

  async function uploadImage(item: ContentItem, file: File) {
    if (!file.type.startsWith('image/')) return toast.error("Ce fichier n'est pas une image")
    if (file.size > 5 * 1024 * 1024) return toast.error('Image trop lourde (max 5 Mo)')
    setUploading(item.key)
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const path = `content/${item.key}-${Date.now()}.${ext}`
    const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type })
    if (error) { setUploading(null); return toast.error(`Erreur upload: ${error.message}`) }
    const { data: { publicUrl } } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path)
    const { error: upErr } = await supabase.from('site_content').update({ value: publicUrl, updated_at: new Date().toISOString() }).eq('key', item.key)
    setUploading(null)
    if (upErr) return toast.error('Erreur de sauvegarde')
    updateValue(item.key, publicUrl)
    toast.success('Image mise à jour')
  }

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('site_content')
      .select('key, label, section, type, value')
      .order('section')
    if (error) toast.error('Erreur de chargement')
    else setItems(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function updateValue(key: string, value: string) {
    setItems(prev => prev.map(i => i.key === key ? { ...i, value } : i))
  }

  async function saveItem(item: ContentItem) {
    setSaving(item.key)
    const { error } = await supabase
      .from('site_content')
      .update({ value: item.value, updated_at: new Date().toISOString() })
      .eq('key', item.key)
    setSaving(null)
    if (error) toast.error('Erreur lors de la sauvegarde')
    else toast.success('Contenu mis à jour')
  }

  const sections = Array.from(new Set(items.map(i => i.section)))

  return (
    <div>
      <Header title="Contenu du site" subtitle="Gérez les textes et médias affichés sur le site" />

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={20} className="animate-spin text-zinc-500" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 text-zinc-500">
          <p className="text-sm">Aucun contenu trouvé. Vérifiez que le schéma Supabase a bien été exécuté.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {sections.map(section => (
            <div key={section} className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-6">
              <h2 className="text-white font-semibold text-sm mb-5">{section}</h2>
              <div className="space-y-4">
                {items.filter(i => i.section === section).map(item => (
                  <div key={item.key}>
                    <label className="text-xs text-zinc-500 uppercase tracking-wider mb-1.5 block">{item.label}</label>

                    {item.type === 'image' ? (
                      <div className="flex items-center gap-4">
                        <div className="w-24 h-24 rounded-xl overflow-hidden border border-[#2a2a2a] bg-[#1a1a1a] flex items-center justify-center flex-shrink-0">
                          {item.value
                            ? <img src={item.value} alt="" className="w-full h-full object-cover" />
                            : <ImageIcon size={20} className="text-zinc-600" />}
                        </div>
                        <div>
                          <label className={`inline-flex items-center gap-2 bg-white text-black text-xs font-semibold px-4 py-2.5 rounded-xl hover:bg-zinc-200 transition-colors cursor-pointer ${uploading === item.key ? 'opacity-50 pointer-events-none' : ''}`}>
                            {uploading === item.key ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                            Changer l'image
                            <input type="file" accept="image/*" className="hidden"
                              onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(item, f); e.currentTarget.value = '' }} />
                          </label>
                          <p className="text-[11px] text-zinc-600 mt-2">JPG, PNG, WEBP · Max 5 Mo</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        {item.type === 'textarea' ? (
                          <textarea
                            value={item.value || ''}
                            onChange={e => updateValue(item.key, e.target.value)}
                            rows={3}
                            className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] text-white text-sm px-4 py-3 rounded-xl outline-none focus:border-white/30 transition-colors resize-none"
                          />
                        ) : (
                          <input
                            value={item.value || ''}
                            onChange={e => updateValue(item.key, e.target.value)}
                            className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] text-white text-sm px-4 py-3 rounded-xl outline-none focus:border-white/30 transition-colors"
                          />
                        )}
                        <button
                          onClick={() => saveItem(item)}
                          disabled={saving === item.key}
                          className="flex items-center gap-1.5 bg-white text-black text-xs font-semibold px-4 py-2 rounded-xl hover:bg-zinc-200 transition-colors disabled:opacity-50 flex-shrink-0">
                          {saving === item.key ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                          Sauver
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
