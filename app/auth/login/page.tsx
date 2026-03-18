'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false) }
    else router.push('/dashboard')
  }

  return (
    <div style={{ minHeight:'100vh', background:'#f6f6f8', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'system-ui,sans-serif' }}>
      <div style={{ background:'white', border:'1px solid #e4e4ea', borderRadius:14, padding:'40px 36px', width:380, boxShadow:'0 4px 24px rgba(0,0,0,0.06)' }}>
        <div style={{ marginBottom:28 }}>
          <div style={{ fontSize:20, fontWeight:700, color:'#0e0e10', marginBottom:4 }}>ops.ai</div>
          <div style={{ fontSize:13, color:'#8b8b99' }}>Sign in to your operator dashboard</div>
        </div>
        <form onSubmit={handleLogin} style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <input
            type="email" placeholder="Email" value={email}
            onChange={e => setEmail(e.target.value)} required
            style={{ padding:'10px 13px', borderRadius:8, border:'1.5px solid #e4e4ea', fontSize:13, outline:'none', fontFamily:'inherit' }}
          />
          <input
            type="password" placeholder="Password" value={password}
            onChange={e => setPassword(e.target.value)} required
            style={{ padding:'10px 13px', borderRadius:8, border:'1.5px solid #e4e4ea', fontSize:13, outline:'none', fontFamily:'inherit' }}
          />
          {error && <div style={{ fontSize:12, color:'#f25f5c' }}>{error}</div>}
          <button type="submit" disabled={loading}
            style={{ padding:'11px', borderRadius:8, background:'#0e0e10', color:'white', border:'none', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <div style={{ marginTop:16, fontSize:12, color:'#8b8b99', textAlign:'center' }}>
          No account? <a href="/auth/signup" style={{ color:'#4f8ef7' }}>Sign up</a>
        </div>
      </div>
    </div>
  )
}
