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

// Demo data — replace with Supabase queries once connected
export const DEMO_SALES = [
  { date: '01/06', ca: 420, commandes: 3 },
  { date: '02/06', ca: 650, commandes: 5 },
  { date: '03/06', ca: 310, commandes: 2 },
  { date: '04/06', ca: 780, commandes: 7 },
  { date: '05/06', ca: 540, commandes: 4 },
  { date: '06/06', ca: 290, commandes: 2 },
  { date: '07/06', ca: 870, commandes: 8 },
  { date: '08/06', ca: 630, commandes: 5 },
  { date: '09/06', ca: 450, commandes: 4 },
  { date: '10/06', ca: 720, commandes: 6 },
  { date: '11/06', ca: 380, commandes: 3 },
  { date: '12/06', ca: 560, commandes: 5 },
  { date: '13/06', ca: 940, commandes: 9 },
  { date: '14/06', ca: 410, commandes: 3 },
  { date: '15/06', ca: 680, commandes: 6 },
  { date: '16/06', ca: 520, commandes: 4 },
  { date: '17/06', ca: 760, commandes: 7 },
  { date: '18/06', ca: 330, commandes: 2 },
  { date: '19/06', ca: 890, commandes: 8 },
  { date: '20/06', ca: 470, commandes: 4 },
  { date: '21/06', ca: 610, commandes: 5 },
  { date: '22/06', ca: 840, commandes: 7 },
  { date: '23/06', ca: 390, commandes: 3 },
  { date: '24/06', ca: 730, commandes: 6 },
  { date: '25/06', ca: 560, commandes: 5 },
  { date: '26/06', ca: 920, commandes: 9 },
  { date: '27/06', ca: 480, commandes: 4 },
  { date: '28/06', ca: 640, commandes: 6 },
  { date: '29/06', ca: 710, commandes: 7 },
  { date: '30/06', ca: 850, commandes: 8 },
]

export const DEMO_ORDERS = [
  { id: 'CMD-001', customer: 'Karim B.', email: 'karim@gmail.com', total: 259, status: 'shipped', date: '2026-06-29', items: 2 },
  { id: 'CMD-002', customer: 'Yasmine M.', email: 'yasmine@gmail.com', total: 130, status: 'delivered', date: '2026-06-28', items: 1 },
  { id: 'CMD-003', customer: 'Léo D.', email: 'leo@gmail.com', total: 395, status: 'confirmed', date: '2026-06-28', items: 3 },
  { id: 'CMD-004', customer: 'Sarah K.', email: 'sarah@gmail.com', total: 109, status: 'pending', date: '2026-06-30', items: 1 },
  { id: 'CMD-005', customer: 'Adam T.', email: 'adam@gmail.com', total: 180, status: 'cancelled', date: '2026-06-27', items: 2 },
]

export const DEMO_NEWSLETTER = 89

export const DEMO_PRODUCTS = [
  { id: '1', name: 'ASICS Gel-1130', brand: 'Asics', price: 130, stock: 8, category: 'Sneakers', active: true, img: '../img/prooduits/asics gel1130.webp' },
  { id: '2', name: 'Saucony Progrid', brand: 'Saucony', price: 109, stock: 3, category: 'Sneakers', active: true, img: '../img/prooduits/sauucony progrid.webp' },
  { id: '3', name: 'T-Shirt Menilo', brand: 'Menilo', price: 85, stock: 0, category: 'Hauts', active: true, img: '../img/prooduits/menilo tshirt.webp' },
  { id: '4', name: 'Essential Tee', brand: 'Essentials', price: 95, stock: 12, category: 'Hauts', active: false, img: '../img/prooduits/essentials tee.webp' },
  { id: '5', name: 'ATM Pant', brand: 'ATM', price: 145, stock: 5, category: 'Bas', active: true, img: '../img/prooduits/atm pant.webp' },
]
