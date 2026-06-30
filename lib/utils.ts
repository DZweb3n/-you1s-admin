import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(amount: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount)
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  }).format(new Date(date))
}

export function formatDateTime(date: string | Date) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  }).format(new Date(date))
}

export function slugify(text: string) {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export const ORDER_STATUSES: Record<string, { label: string; color: string }> = {
  pending:   { label: 'En attente',  color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' },
  confirmed: { label: 'Confirmée',   color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
  shipped:   { label: 'Expédiée',    color: 'text-purple-400 bg-purple-400/10 border-purple-400/20' },
  delivered: { label: 'Livrée',      color: 'text-green-400 bg-green-400/10 border-green-400/20' },
  cancelled: { label: 'Annulée',     color: 'text-red-400 bg-red-400/10 border-red-400/20' },
  refunded:  { label: 'Remboursée',  color: 'text-zinc-400 bg-zinc-400/10 border-zinc-400/20' },
}

