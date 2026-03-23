'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

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
    <div className="auth-shell">
      <div className="auth-card">
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--brand)' }} />
            <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>OPSAI</div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 6 }}>Welcome back</div>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>Sign in to manage campaigns, inbox, and analytics.</div>
        </div>
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <div className="auth-label">Email address</div>
            <input type="email" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} required className="auth-input" />
          </div>
          <div>
            <div className="auth-label">Password</div>
            <input type="password" placeholder="Enter your password" value={password} onChange={e => setPassword(e.target.value)} required className="auth-input" />
          </div>
          {error && <div style={{ fontSize: 12, color: 'var(--danger)' }}>{error}</div>}
          <button type="submit" disabled={loading} className="auth-btn">
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <div style={{ marginTop: 16, fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>
          No account? <Link href="/auth/signup">Create one</Link>
        </div>
      </div>
    </div>
  )
}
