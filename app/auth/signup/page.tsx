'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [bizName, setBizName] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { data, error: signupError } = await supabase.auth.signUp({ email, password })
    if (signupError) { setError(signupError.message); setLoading(false); return }
    if (data.user) {
      await supabase.from('businesses').insert({
        user_id: data.user.id,
        name: bizName,
        owner_name: ownerName,
        services: 'Add your services here',
        hours: 'Mon-Fri 9am-5pm',
        booking_link: '',
        location: '',
      })
    }
    router.push('/dashboard')
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--brand)' }} />
            <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>OPSAI</div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 6 }}>Create your account</div>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>Set up your workspace and start automating operations.</div>
        </div>
        <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <div className="auth-label">Business name</div>
            <input type="text" placeholder="Acme Services" value={bizName} onChange={e => setBizName(e.target.value)} required className="auth-input" />
          </div>
          <div>
            <div className="auth-label">Your name</div>
            <input type="text" placeholder="Jordan Lee" value={ownerName} onChange={e => setOwnerName(e.target.value)} required className="auth-input" />
          </div>
          <div>
            <div className="auth-label">Email address</div>
            <input type="email" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} required className="auth-input" />
          </div>
          <div>
            <div className="auth-label">Password</div>
            <input type="password" placeholder="Create a secure password" value={password} onChange={e => setPassword(e.target.value)} required className="auth-input" />
          </div>
          {error && <div style={{ fontSize: 12, color: 'var(--danger)' }}>{error}</div>}
          <button type="submit" disabled={loading} className="auth-btn">
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>
        <div style={{ marginTop: 16, fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>
          Already have an account? <Link href="/auth/login">Sign in</Link>
        </div>
      </div>
    </div>
  )
}
