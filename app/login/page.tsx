'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Lock, Mail } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { createClient, isSupabaseConfigured } from '@/lib/supabase'
import toast, { Toaster } from 'react-hot-toast'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const setSize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    setSize()
    type P = { x: number; y: number; v: number; o: number }
    let ps: P[] = []
    let raf = 0
    const make = (): P => ({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, v: Math.random() * 0.25 + 0.05, o: Math.random() * 0.35 + 0.15 })
    const init = () => { ps = []; const count = Math.floor((canvas.width * canvas.height) / 9000); for (let i = 0; i < count; i++) ps.push(make()) }
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ps.forEach(p => {
        p.y -= p.v
        if (p.y < 0) { p.x = Math.random() * canvas.width; p.y = canvas.height + 40; p.v = Math.random() * 0.25 + 0.05; p.o = Math.random() * 0.35 + 0.15 }
        ctx.fillStyle = `rgba(250,250,250,${p.o})`
        ctx.fillRect(p.x, p.y, 0.7, 2.2)
      })
      raf = requestAnimationFrame(draw)
    }
    window.addEventListener('resize', () => { setSize(); init() })
    init(); raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) return toast.error('Email et mot de passe requis')
    setLoading(true)
    if (!isSupabaseConfigured()) {
      await new Promise(r => setTimeout(r, 700))
      toast.success('Connexion réussie')
      router.push('/')
      return
    }
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { toast.error('Email ou mot de passe incorrect'); setLoading(false) }
    else { router.push('/'); router.refresh() }
  }

  return (
    <section className="fixed inset-0 bg-zinc-950 text-zinc-50">
      <Toaster position="top-right" toastOptions={{ style: { background: '#1a1a1a', color: '#fff', border: '1px solid #333' } }} />

      <style>{`
        .accent-lines{position:absolute;inset:0;pointer-events:none;opacity:.7}
        .hline,.vline{position:absolute;background:#27272a;will-change:transform,opacity}
        .hline{left:0;right:0;height:1px;transform:scaleX(0);transform-origin:50% 50%;animation:drawX .8s cubic-bezier(.22,.61,.36,1) forwards}
        .vline{top:0;bottom:0;width:1px;transform:scaleY(0);transform-origin:50% 0%;animation:drawY .9s cubic-bezier(.22,.61,.36,1) forwards}
        .hline:nth-child(1){top:18%;animation-delay:.12s}
        .hline:nth-child(2){top:50%;animation-delay:.22s}
        .hline:nth-child(3){top:82%;animation-delay:.32s}
        .vline:nth-child(4){left:22%;animation-delay:.42s}
        .vline:nth-child(5){left:50%;animation-delay:.54s}
        .vline:nth-child(6){left:78%;animation-delay:.66s}
        @keyframes drawX{0%{transform:scaleX(0);opacity:0}100%{transform:scaleX(1);opacity:.7}}
        @keyframes drawY{0%{transform:scaleY(0);opacity:0}100%{transform:scaleY(1);opacity:.7}}
        .card-animate{opacity:0;transform:translateY(20px);animation:fadeUp .8s cubic-bezier(.22,.61,.36,1) .4s forwards}
        @keyframes fadeUp{to{opacity:1;transform:translateY(0)}}
      `}</style>

      <div className="absolute inset-0 pointer-events-none [background:radial-gradient(80%_60%_at_50%_30%,rgba(255,255,255,0.06),transparent_60%)]" />

      <div className="accent-lines">
        <div className="hline" /><div className="hline" /><div className="hline" />
        <div className="vline" /><div className="vline" /><div className="vline" />
      </div>

      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-50 mix-blend-screen pointer-events-none" />

      <header className="absolute left-0 right-0 top-0 flex items-center justify-between px-6 py-4 border-b border-zinc-800/80">
        <span className="text-xs tracking-[0.18em] uppercase text-zinc-400 font-semibold">YOU1S</span>
        <span className="text-xs tracking-[0.14em] uppercase text-zinc-600">Admin Panel</span>
      </header>

      <div className="h-full w-full grid place-items-center px-4">
        <Card className="card-animate w-full max-w-sm border-zinc-800 bg-zinc-900/70 backdrop-blur supports-[backdrop-filter]:bg-zinc-900/60">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-zinc-50">Connexion</CardTitle>
            <CardDescription className="text-zinc-400">
              Accès réservé aux administrateurs
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleLogin} className="grid gap-5">
              <div className="grid gap-2">
                <Label htmlFor="email" className="text-zinc-300">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="admin@you1s.fr"
                    autoComplete="email"
                    className="pl-10 bg-zinc-950 border-zinc-800 text-zinc-50 placeholder:text-zinc-600 focus-visible:ring-zinc-700"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="password" className="text-zinc-300">Mot de passe</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="pl-10 pr-10 bg-zinc-950 border-zinc-800 text-zinc-50 placeholder:text-zinc-600 focus-visible:ring-zinc-700"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Masquer' : 'Afficher'}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-md text-zinc-400 hover:text-zinc-200 transition-colors"
                    onClick={() => setShowPassword(v => !v)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-10 rounded-lg bg-zinc-50 text-zinc-900 hover:bg-zinc-200 font-semibold"
              >
                {loading ? 'Connexion...' : 'Se connecter'}
              </Button>
            </form>
          </CardContent>

          {!isSupabaseConfigured() && (
            <CardFooter className="flex items-center justify-center text-xs text-zinc-600">
              Mode démo — toute combinaison fonctionne
            </CardFooter>
          )}
        </Card>
      </div>
    </section>
  )
}

