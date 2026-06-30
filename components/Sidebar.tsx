'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import {
  LayoutDashboard, Package, ShoppingBag, Tag,
  Warehouse, BarChart2, FileImage, LogOut, ExternalLink
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/produits', label: 'Produits', icon: Package },
  { href: '/commandes', label: 'Commandes', icon: ShoppingBag },
  { href: '/categories', label: 'Catégories', icon: Tag },
  { href: '/stock', label: 'Stock', icon: Warehouse },
  { href: '/statistiques', label: 'Statistiques', icon: BarChart2 },
  { href: '/contenu', label: 'Contenu', icon: FileImage },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-[220px] bg-[#111] border-r border-[#1e1e1e] flex flex-col z-50">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-[#1e1e1e]">
        <div className="font-display font-black text-xl tracking-wider text-white">YOU1S</div>
        <div className="text-[10px] text-zinc-600 tracking-[0.25em] uppercase mt-0.5">Admin Panel</div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link key={href} href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all',
                active
                  ? 'bg-white text-black font-semibold'
                  : 'text-zinc-400 hover:text-white hover:bg-[#1a1a1a]'
              )}>
              <Icon size={16} className={active ? 'text-black' : ''} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-4 space-y-1 border-t border-[#1e1e1e] pt-3">
        <a href={process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-500 hover:text-white hover:bg-[#1a1a1a] transition-all">
          <ExternalLink size={16} />
          Voir le site
        </a>
        <button onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-500 hover:text-red-400 hover:bg-red-500/5 transition-all">
          <LogOut size={16} />
          Déconnexion
        </button>
      </div>
    </aside>
  )
}
