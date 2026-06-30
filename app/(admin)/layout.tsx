import Sidebar from '@/components/Sidebar'
import { Toaster } from 'react-hot-toast'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Sidebar />
      <main className="ml-[220px] min-h-screen p-8">
        {children}
      </main>
      <Toaster position="top-right" toastOptions={{
        style: { background: '#1a1a1a', color: '#fff', border: '1px solid #333', fontSize: '13px' },
        success: { iconTheme: { primary: '#22c55e', secondary: '#111' } },
        error: { iconTheme: { primary: '#ef4444', secondary: '#111' } },
      }} />
    </div>
  )
}
