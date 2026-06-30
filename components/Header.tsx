'use client'
import { Bell, Search } from 'lucide-react'

interface HeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
}

export default function Header({ title, subtitle, action }: HeaderProps) {
  return (
    <div className="flex items-center justify-between mb-8">
      <div>
        <h1 className="text-xl font-display font-bold text-white tracking-wide">{title}</h1>
        {subtitle && <p className="text-zinc-500 text-sm mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        {action}
        <button className="w-9 h-9 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-zinc-400 hover:text-white hover:border-[#333] transition-all">
          <Bell size={15} />
        </button>
      </div>
    </div>
  )
}
