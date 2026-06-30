'use client'
import { useState } from 'react'
import { Upload, Save, Edit2, Check } from 'lucide-react'
import Header from '@/components/Header'
import toast from 'react-hot-toast'

const CONTENT_SECTIONS = [
  {
    section: 'Hero Slider',
    items: [
      { key: 'hero_slide_1_title', label: 'Slide 1 - Titre', type: 'text', value: 'Nouveautés' },
      { key: 'hero_slide_1_subtitle', label: 'Slide 1 - Sous-titre', type: 'text', value: 'Découvrez les dernières pièces de la collection' },
      { key: 'hero_slide_1_cta', label: 'Slide 1 - Bouton', type: 'text', value: 'Voir la collection' },
      { key: 'hero_slide_1_img', label: 'Slide 1 - Image', type: 'image', value: '/img/prooduits/asics gel1130.webp' },
      { key: 'hero_slide_2_title', label: 'Slide 2 - Titre', type: 'text', value: 'Incontournables' },
      { key: 'hero_slide_2_img', label: 'Slide 2 - Image', type: 'image', value: '/img/prooduits/incontournable.jpg' },
    ]
  },
  {
    section: 'Section Éditoriale',
    items: [
      { key: 'editorial_label', label: 'Label', type: 'text', value: 'You1s Notre ADN' },
      { key: 'editorial_title', label: 'Titre', type: 'text', value: "L'Authenticité Avant Tout" },
      { key: 'editorial_desc', label: 'Description', type: 'textarea', value: "Pas de hype vide. Pas de compromis. You1s c'est une vision..." },
      { key: 'editorial_cta', label: 'Bouton', type: 'text', value: 'Explorer la sélection' },
      { key: 'editorial_img', label: 'Image', type: 'image', value: '/img/prooduits/incontournable.jpg' },
    ]
  },
  {
    section: 'Restocks',
    items: [
      { key: 'restock_banner_title', label: 'Titre bannière', type: 'text', value: 'Restocks' },
      { key: 'restock_banner_sub', label: 'Sous-titre', type: 'text', value: 'Les pièces les plus désirées sont de retour' },
    ]
  },
  {
    section: 'Newsletter',
    items: [
      { key: 'newsletter_title', label: 'Titre', type: 'text', value: 'Rejoignez la communauté' },
      { key: 'newsletter_sub', label: 'Sous-titre', type: 'text', value: 'Accès en avant-première aux restocks et nouvelles collections' },
      { key: 'newsletter_placeholder', label: 'Placeholder email', type: 'text', value: 'Votre email' },
      { key: 'newsletter_btn', label: 'Bouton', type: 'text', value: "S'inscrire" },
    ]
  },
]

export default function ContenuPage() {
  const [content, setContent] = useState<Record<string, string>>(
    Object.fromEntries(CONTENT_SECTIONS.flatMap(s => s.items).map(i => [i.key, i.value]))
  )
  const [editing, setEditing] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)

  function saveField(key: string) {
    setSaved(key)
    setTimeout(() => setSaved(null), 2000)
    toast.success('Contenu sauvegardé')
    setEditing(null)
  }

  return (
    <div>
      <Header
        title="Contenu du site"
        subtitle="Modifiez les textes et images sans toucher au code"
      />

      <div className="space-y-6">
        {CONTENT_SECTIONS.map(({ section, items }) => (
          <div key={section} className="bg-[#111] border border-[#1e1e1e] rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#1e1e1e]">
              <h2 className="text-white font-semibold text-sm">{section}</h2>
            </div>
            <div className="divide-y divide-[#1a1a1a]">
              {items.map(({ key, label, type }) => (
                <div key={key} className="px-6 py-4 flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">{label}</p>
                    {type === 'image' ? (
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-12 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] overflow-hidden flex items-center justify-center flex-shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={content[key]} alt="" className="w-full h-full object-cover"
                            onError={(e: any) => { e.target.style.display = 'none' }} />
                        </div>
                        <label className="flex items-center gap-2 text-xs text-zinc-400 hover:text-white border border-[#2a2a2a] hover:border-[#333] px-3 py-2 rounded-lg cursor-pointer transition-all">
                          <Upload size={12} />
                          Changer l'image
                          <input type="file" accept="image/*" className="hidden"
                            onChange={() => toast.success('Connectez Supabase Storage pour l\'upload')} />
                        </label>
                        <span className="text-xs text-zinc-600 truncate max-w-xs">{content[key]}</span>
                      </div>
                    ) : editing === key ? (
                      <div className="flex gap-2">
                        {type === 'textarea' ? (
                          <textarea value={content[key]} onChange={e => setContent(p => ({ ...p, [key]: e.target.value }))} rows={3}
                            className="flex-1 bg-[#1a1a1a] border border-white/20 text-white text-sm px-3 py-2 rounded-xl outline-none resize-none" />
                        ) : (
                          <input value={content[key]} onChange={e => setContent(p => ({ ...p, [key]: e.target.value }))}
                            className="flex-1 bg-[#1a1a1a] border border-white/20 text-white text-sm px-3 py-2 rounded-xl outline-none" />
                        )}
                        <button onClick={() => saveField(key)}
                          className="flex items-center gap-1.5 text-xs bg-white text-black font-semibold px-3 py-2 rounded-lg hover:bg-zinc-200 transition-colors whitespace-nowrap">
                          <Check size={12} /> Sauver
                        </button>
                        <button onClick={() => setEditing(null)} className="text-xs text-zinc-500 hover:text-white px-3 py-2 transition-colors">✕</button>
                      </div>
                    ) : (
                      <p className="text-sm text-zinc-300 line-clamp-2">{content[key]}</p>
                    )}
                  </div>
                  {type !== 'image' && editing !== key && (
                    <button onClick={() => setEditing(key)}
                      className="w-8 h-8 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-zinc-400 hover:text-white hover:border-[#333] transition-all flex-shrink-0 mt-5">
                      {saved === key ? <Check size={13} className="text-green-400" /> : <Edit2 size={13} />}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
