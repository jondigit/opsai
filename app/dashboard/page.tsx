'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Dashboard() {
  const [business, setBusiness] = useState<any>(null)
  const [contacts, setContacts] = useState<any[]>([])
  const [invoices, setInvoices] = useState<any[]>([])
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [activity, setActivity] = useState<any[]>([])
  const [messages, setMessages] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState('dashboard')
  const [selectedContact, setSelectedContact] = useState<any>(null)
  const [thread, setThread] = useState<any[]>([])
  const [toast, setToast] = useState('')
  const [loading, setLoading] = useState(true)
  const [showCampaignModal, setShowCampaignModal] = useState(false)
  const [campaignGoal, setCampaignGoal] = useState('')
  const [campaignType, setCampaignType] = useState('email')
  const [campaignDraft, setCampaignDraft] = useState('')
  const [campaignName, setCampaignName] = useState('')
  const [campaignLoading, setCampaignLoading] = useState(false)
  const [campaignStep, setCampaignStep] = useState<'write'|'review'>('write')
  const [editingMsg, setEditingMsg] = useState<string|null>(null)
  const [editedContent, setEditedContent] = useState('')
  const [darkMode, setDarkMode] = useState(false)
  const [animatedStats, setAnimatedStats] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [slideContact, setSlideContact] = useState<any>(null)
  const [replyInput, setReplyInput] = useState('')
  const threadEndRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const supabase = createClient()
  const F = 'system-ui,sans-serif'

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      const { data: biz } = await supabase.from('businesses').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).single()
      if (biz) {
        setBusiness(biz)
        const [c, inv, camp, act, msg] = await Promise.all([
          supabase.from('contacts').select('*').eq('business_id', biz.id).order('created_at', { ascending: false }),
          supabase.from('invoices').select('*').eq('business_id', biz.id).order('created_at', { ascending: false }),
          supabase.from('campaigns').select('*').eq('business_id', biz.id).order('created_at', { ascending: false }),
          supabase.from('activity').select('*').eq('business_id', biz.id).order('created_at', { ascending: false }).limit(12),
          supabase.from('messages').select('*').eq('business_id', biz.id).order('created_at', { ascending: false }),
        ])
        if (c.data) setContacts(c.data)
        if (inv.data) setInvoices(inv.data)
        if (camp.data) setCampaigns(camp.data)
        if (act.data) setActivity(act.data)
        if (msg.data) setMessages(msg.data)
        supabase.channel('activity-feed')
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity', filter: `business_id=eq.${biz.id}` }, payload => {
            setActivity(prev => [payload.new as any, ...prev].slice(0, 12))
          })
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `business_id=eq.${biz.id}` }, payload => {
            setMessages(prev => [payload.new as any, ...prev])
          })
          .subscribe()
      }
      setLoading(false)
      setTimeout(() => setAnimatedStats(true), 100)
    }
    load()
  }, [])

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [thread])

  async function loadThread(contact: any) {
    setSelectedContact(contact)
    const { data } = await supabase.from('messages').select('*').eq('contact_id', contact.id).order('created_at', { ascending: true })
    if (data) setThread(data)
  }

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000) }
  function timeAgo(ts: string) {
    const mins = Math.floor((Date.now() - new Date(ts).getTime()) / 60000)
    if (mins < 60) return mins + 'm ago'
    if (mins < 1440) return Math.floor(mins / 60) + 'h ago'
    return Math.floor(mins / 1440) + 'd ago'
  }
  function sc(s: string) {
    if (s === 'paid' || s === 'live' || s === 'done') return { background: 'rgba(82,183,136,0.12)', color: '#52b788' }
    if (s === 'overdue') return { background: 'rgba(242,95,92,0.12)', color: '#f25f5c' }
    if (s === 'sched') return { background: 'rgba(244,162,55,0.12)', color: '#f4a237' }
    return { background: 'rgba(79,142,247,0.1)', color: '#4f8ef7' }
  }
  async function signOut() { await supabase.auth.signOut(); router.push('/auth/login') }

  const bg = darkMode ? '#0e0e10' : '#f4f4f7'
  const surface = darkMode ? '#1a1a1f' : 'white'
  const border = darkMode ? '#2a2a35' : '#eaeaef'
  const text = darkMode ? '#e8e8f0' : '#0e0e10'
  const muted = '#8b8b99'
  const subtext = darkMode ? '#6b6b80' : '#b4b4c2'

  const collected = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.amount), 0)
  const outstanding = invoices.filter(i => i.status === 'pending').reduce((s, i) => s + Number(i.amount), 0)
  const overdue = invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + Number(i.amount), 0)
  const pending = messages.filter(m => m.status === 'pending_approval')
  const contactThreads = contacts.map(c => {
    const msgs = messages.filter(m => m.contact_id === c.id).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    return { ...c, lastMsg: msgs[0] || null, hasPending: msgs.some(m => m.status === 'pending_approval'), msgCount: msgs.length, totalSpend: invoices.filter(inv => inv.contact_id === c.id).reduce((s, inv) => s + Number(inv.amount), 0) }
  }).filter(c => c.lastMsg).sort((a, b) => new Date(b.lastMsg.created_at).getTime() - new Date(a.lastMsg.created_at).getTime())
  const channelColor: any = { instagram: '#e1306c', email: '#4f8ef7', sms: '#52b788', web: '#f4a237' }

  async function generateCampaign() {
    if (!campaignGoal.trim()) return
    setCampaignLoading(true)
    try {
      const res = await fetch('/api/campaign', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ businessName: business.name, services: business.services, bookingLink: business.booking_link, goal: campaignGoal, type: campaignType }) })
      const data = await res.json()
      setCampaignDraft(data.content || 'Add your Anthropic API key to enable AI campaign writing.')
      setCampaignStep('review')
    } catch { setCampaignDraft('Something went wrong.'); setCampaignStep('review') }
    setCampaignLoading(false)
  }

  async function saveCampaign() {
    if (!campaignName.trim() || !campaignDraft.trim()) return
    const { data } = await supabase.from('campaigns').insert({ business_id: business.id, name: campaignName, type: campaignType, content: campaignDraft, status: 'sched', sent_count: 0, conversion_count: 0 }).select().single()
    if (data) setCampaigns(prev => [data, ...prev])
    setShowCampaignModal(false); setCampaignGoal(''); setCampaignDraft(''); setCampaignName(''); setCampaignStep('write')
    showToast('Campaign saved and scheduled')
  }

  async function approveMessage(msgId: string, content?: string) {
    await supabase.from('messages').update({ status: 'sent', ...(content ? { content } : {}) }).eq('id', msgId)
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, status: 'sent', ...(content ? { content } : {}) } : m))
    setEditingMsg(null); showToast('Reply approved and sent')
  }

  async function discardMessage(msgId: string) {
    await supabase.from('messages').update({ status: 'rejected' }).eq('id', msgId)
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, status: 'rejected' } : m))
    showToast('Reply discarded')
  }

  async function sendReply() {
    if (!replyInput.trim() || !selectedContact) return
    setIsTyping(true)
    setTimeout(() => setIsTyping(false), 2000)
    const { data } = await supabase.from('messages').insert({ business_id: business.id, contact_id: selectedContact.id, direction: 'outbound', channel: thread[0]?.channel || 'email', content: replyInput, ai_generated: false, status: 'sent', created_at: new Date().toISOString() }).select().single()
    if (data) setThread(prev => [...prev, data])
    setReplyInput('')
    showToast('Reply sent')
  }

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', fontFamily:F, background:bg, flexDirection:'column', gap:12 }}>
      <div style={{ width:32, height:32, border:`3px solid ${border}`, borderTop:'3px solid #4f8ef7', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}></div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (!business) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', fontFamily:F }}>No business found</div>

  const tabs = [
    { id:'dashboard', label:'Dashboard' },
    { id:'inbox', label:'Inbox', count: contactThreads.length },
    { id:'approvals', label:'Approvals', count: pending.length, alert: pending.length > 0 },
    { id:'campaigns', label:'Campaigns' },
    { id:'invoices', label:'Invoices' },
    { id:'analytics', label:'Analytics' },
    { id:'settings', label:'Settings' },
  ]

  const card = (extra?: any): React.CSSProperties => ({ background:surface, border:`1px solid ${border}`, borderRadius:14, overflow:'hidden' as const, ...extra })
  const cardHead: React.CSSProperties = { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 20px', borderBottom:`1px solid ${border}` }
  const cardTitle: React.CSSProperties = { fontSize:13, fontWeight:700, color:text, letterSpacing:'-.2px' }
  const aiReplied = messages.filter(m => m.ai_generated).length
  const avgResponse = messages.filter(m => m.ai_generated && m.response_time_seconds).length > 0
    ? Math.round(messages.filter(m => m.ai_generated && m.response_time_seconds).reduce((s,m) => s + (m.response_time_seconds||0), 0) / messages.filter(m => m.ai_generated && m.response_time_seconds).length)
    : 0

  return (
    <div style={{ display:'flex', height:'100vh', fontFamily:F, background:bg, transition:'background .3s' }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse-ring{0%{box-shadow:0 0 0 0 rgba(242,95,92,0.4)}70%{box-shadow:0 0 0 6px rgba(242,95,92,0)}100%{box-shadow:0 0 0 0 rgba(242,95,92,0)}}
        @keyframes countup{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
        @keyframes slidein{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}
        @keyframes fadeup{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
        @keyframes typing{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-4px)}}
        .stat-num{animation:countup .5s ease forwards}
        .pulse-badge{animation:pulse-ring 1.5s ease infinite}
        .fade-in{animation:fadeup .3s ease forwards}
        .slide-panel{animation:slidein .25s ease forwards}
      `}</style>

      {toast && <div style={{ position:'fixed', bottom:24, right:24, background:'#0e0e10', borderRadius:10, padding:'12px 18px', fontSize:12, fontWeight:600, color:'white', boxShadow:'0 8px 32px rgba(0,0,0,0.2)', zIndex:900, display:'flex', alignItems:'center', gap:8 }}><div style={{ width:6, height:6, borderRadius:'50%', background:'#52b788' }}></div>{toast}</div>}

      {slideContact && (
        <div style={{ position:'fixed', inset:0, zIndex:700, display:'flex' }} onClick={() => setSlideContact(null)}>
          <div style={{ flex:1 }}></div>
          <div className="slide-panel" style={{ width:360, background:surface, borderLeft:`1px solid ${border}`, height:'100vh', overflow:'auto', padding:'24px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
              <div style={{ fontSize:15, fontWeight:700, color:text }}>Contact Profile</div>
              <button onClick={() => setSlideContact(null)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:20, color:muted }}>×</button>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
              <div style={{ width:52, height:52, borderRadius:14, background:'#4f8ef7', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:20, color:'white' }}>{slideContact.name[0]}</div>
              <div>
                <div style={{ fontSize:16, fontWeight:700, color:text }}>{slideContact.name}</div>
                <div style={{ fontSize:12, color:muted, marginTop:2 }}>{slideContact.email}</div>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:24 }}>
              {[
                { label:'Messages', val: messages.filter(m => m.contact_id === slideContact.id).length },
                { label:'Channel', val: slideContact.lastMsg?.channel?.toUpperCase() || '—' },
                { label:'Total Spend', val: '$' + slideContact.totalSpend.toLocaleString() },
                { label:'First Contact', val: timeAgo(slideContact.created_at) },
              ].map((s,i) => (
                <div key={i} style={{ background:bg, borderRadius:10, padding:'12px 14px' }}>
                  <div style={{ fontSize:18, fontWeight:700, color:text }}>{s.val}</div>
                  <div style={{ fontSize:10, color:muted, textTransform:'uppercase', letterSpacing:.5, marginTop:2 }}>{s.label}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize:12, fontWeight:700, color:text, marginBottom:10, textTransform:'uppercase', letterSpacing:.5 }}>Message History</div>
            {messages.filter(m => m.contact_id === slideContact.id).sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0,8).map((msg,i) => (
              <div key={i} style={{ padding:'10px 0', borderBottom:`1px solid ${border}` }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                  <span style={{ fontSize:10, fontWeight:600, color: msg.direction==='outbound' ? '#4f8ef7' : muted }}>{msg.direction === 'outbound' ? 'OPSAI' : 'Customer'}</span>
                  <span style={{ fontSize:10, color:subtext }}>{timeAgo(msg.created_at)}</span>
                </div>
                <div style={{ fontSize:12, color:muted, lineHeight:1.5, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{msg.content}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showCampaignModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:800, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:surface, borderRadius:18, width:580, maxHeight:'82vh', overflow:'auto', boxShadow:'0 24px 80px rgba(0,0,0,0.25)' }}>
            <div style={{ padding:'22px 26px', borderBottom:`1px solid ${border}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div>
                <div style={{ fontSize:16, fontWeight:700, color:text }}>New Campaign</div>
                <div style={{ fontSize:12, color:muted, marginTop:2 }}>AI writes it — you approve it</div>
              </div>
              <button onClick={() => { setShowCampaignModal(false); setCampaignGoal(''); setCampaignDraft(''); setCampaignName(''); setCampaignStep('write') }} style={{ background:bg, border:'none', width:32, height:32, borderRadius:8, cursor:'pointer', fontSize:18, color:muted, display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
            </div>
            <div style={{ padding:'22px 26px' }}>
              {campaignStep === 'write' ? (
                <>
                  <div style={{ marginBottom:18 }}>
                    <div style={{ fontSize:11, fontWeight:700, color:text, textTransform:'uppercase', letterSpacing:.5, marginBottom:8 }}>Channel</div>
                    <div style={{ display:'flex', gap:8 }}>
                      {['email','sms','instagram'].map(t => (
                        <button key={t} onClick={() => setCampaignType(t)} style={{ padding:'7px 16px', borderRadius:8, border: campaignType===t ? 'none' : `1px solid ${border}`, background: campaignType===t ? '#0e0e10' : surface, color: campaignType===t ? 'white' : muted, fontFamily:F, fontSize:12, fontWeight:600, cursor:'pointer' }}>
                          {t.charAt(0).toUpperCase()+t.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div style={{ marginBottom:22 }}>
                    <div style={{ fontSize:11, fontWeight:700, color:text, textTransform:'uppercase', letterSpacing:.5, marginBottom:8 }}>What is your goal?</div>
                    <textarea value={campaignGoal} onChange={e => setCampaignGoal(e.target.value)} placeholder="e.g. Re-engage customers who haven't ordered in 60 days..." style={{ width:'100%', padding:'12px 14px', borderRadius:10, border:`1.5px solid ${border}`, fontSize:13, fontFamily:F, resize:'none', height:110, outline:'none', color:text, background:bg, lineHeight:1.6 }}/>
                    <div style={{ fontSize:10, color:subtext, marginTop:4, textAlign:'right' }}>{campaignGoal.length} characters</div>
                  </div>
                  <button onClick={generateCampaign} disabled={campaignLoading || !campaignGoal.trim()} style={{ width:'100%', padding:'12px', borderRadius:10, background: campaignLoading || !campaignGoal.trim() ? border : '#0e0e10', color: campaignLoading || !campaignGoal.trim() ? muted : 'white', border:'none', cursor: campaignLoading || !campaignGoal.trim() ? 'default' : 'pointer', fontSize:13, fontWeight:600, fontFamily:F }}>
                    {campaignLoading ? '✦ Writing...' : '✦ Generate Campaign'}
                  </button>
                </>
              ) : (
                <>
                  <div style={{ marginBottom:16 }}>
                    <div style={{ fontSize:11, fontWeight:700, color:text, textTransform:'uppercase', letterSpacing:.5, marginBottom:8 }}>Campaign name</div>
                    <input value={campaignName} onChange={e => setCampaignName(e.target.value)} placeholder="e.g. Spring Collection Drop" style={{ width:'100%', padding:'10px 14px', borderRadius:10, border:`1.5px solid ${border}`, fontSize:13, fontFamily:F, outline:'none', color:text, background:bg }}/>
                  </div>
                  <div style={{ marginBottom:20 }}>
                    <div style={{ fontSize:11, fontWeight:700, color:text, textTransform:'uppercase', letterSpacing:.5, marginBottom:8 }}>AI Draft — edit if needed</div>
                    <textarea value={campaignDraft} onChange={e => setCampaignDraft(e.target.value)} style={{ width:'100%', padding:'14px', borderRadius:10, border:'1.5px solid #4f8ef7', fontSize:12.5, fontFamily:F, resize:'none', height:220, outline:'none', color:text, background:bg, lineHeight:1.65 }}/>
                    <div style={{ fontSize:10, color:subtext, marginTop:4, textAlign:'right' }}>{campaignDraft.length} characters</div>
                  </div>
                  <div style={{ display:'flex', gap:8 }}>
                    <button onClick={saveCampaign} disabled={!campaignName.trim()} style={{ flex:1, padding:'12px', borderRadius:10, background: !campaignName.trim() ? border : '#52b788', color: !campaignName.trim() ? muted : 'white', border:'none', cursor: !campaignName.trim() ? 'default' : 'pointer', fontSize:13, fontWeight:600, fontFamily:F }}>Save & Schedule</button>
                    <button onClick={() => setCampaignStep('write')} style={{ padding:'12px 18px', borderRadius:10, background:bg, color:muted, border:'none', cursor:'pointer', fontSize:13, fontFamily:F }}>Back</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SIDEBAR */}
      <nav style={{ width:228, background:surface, borderRight:`1px solid ${border}`, display:'flex', flexDirection:'column', height:'100vh', flexShrink:0, transition:'background .3s' }}>
        <div style={{ padding:'20px 18px 16px', borderBottom:`1px solid ${border}` }}>
          <div style={{ fontSize:16, fontWeight:700, color:text, letterSpacing:'1px', marginBottom:3 }}>OPSAI</div>
          <div style={{ fontSize:10, color:subtext, textTransform:'uppercase', letterSpacing:1, fontWeight:500 }}>{business.name}</div>
        </div>
        <div style={{ flex:1, padding:'10px', overflowY:'auto' }}>
          {tabs.map(t => (
            <div key={t.id} onClick={() => { setActiveTab(t.id); setSelectedContact(null) }}
              style={{ padding:'9px 12px', borderRadius:9, cursor:'pointer', fontSize:12.5, fontWeight:500, marginBottom:2, color: activeTab===t.id ? '#4f8ef7' : muted, background: activeTab===t.id ? 'rgba(79,142,247,0.09)' : 'transparent', display:'flex', alignItems:'center', justifyContent:'space-between', transition:'all .12s' }}>
              <span>{t.label}</span>
              {(t as any).count !== undefined && (t as any).count > 0 && (
                <span className={(t as any).alert ? 'pulse-badge' : ''} style={{ fontSize:10, fontWeight:600, padding:'1px 6px', borderRadius:100, background: (t as any).alert ? 'rgba(242,95,92,0.12)' : 'rgba(79,142,247,0.1)', color: (t as any).alert ? '#f25f5c' : '#4f8ef7' }}>{(t as any).count}</span>
              )}
            </div>
          ))}
        </div>
        <div style={{ padding:'12px 10px', borderTop:`1px solid ${border}` }}>
          <div style={{ display:'flex', alignItems:'center', gap:7, padding:'8px 12px', borderRadius:9, background:'rgba(82,183,136,0.07)', border:'1px solid rgba(82,183,136,0.15)', marginBottom:8 }}>
            <div style={{ width:6, height:6, borderRadius:'50%', background:'#52b788', animation:'pulse-ring 2s ease infinite' }}></div>
            <div style={{ fontSize:11.5, fontWeight:500, color:'#52b788' }}>OPSAI running</div>
          </div>
          <button onClick={() => setDarkMode(!darkMode)} style={{ width:'100%', padding:'7px', borderRadius:9, cursor:'pointer', fontSize:12, fontWeight:500, fontFamily:F, background:bg, color:muted, border:`1px solid ${border}`, marginBottom:6 }}>
            {darkMode ? '☀ Light mode' : '☾ Dark mode'}
          </button>
          <button onClick={signOut} style={{ width:'100%', padding:'7px', borderRadius:9, cursor:'pointer', fontSize:12, fontWeight:500, fontFamily:F, background:'transparent', color:muted, border:`1px solid ${border}` }}>Sign out</button>
        </div>
      </nav>

      {/* MAIN */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <div style={{ height:56, background:surface, borderBottom:`1px solid ${border}`, padding:'0 28px', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <div>
            <div style={{ fontSize:15, fontWeight:700, color:text, letterSpacing:'-.3px' }}>
              {activeTab==='inbox' && selectedContact ? selectedContact.name : tabs.find(t=>t.id===activeTab)?.label}
            </div>
            <div style={{ fontSize:10.5, color:subtext, marginTop:1 }}>OPSAI — {business.name}</div>
          </div>
          <button onClick={() => { setShowCampaignModal(true); setCampaignStep('write') }} style={{ padding:'8px 18px', borderRadius:9, cursor:'pointer', fontSize:12.5, fontWeight:600, fontFamily:F, background:'#0e0e10', color:'white', border:'none' }}>
            + New Campaign
          </button>
        </div>

        <div style={{ flex:1, overflow:'hidden', display:'flex' }}>

          {activeTab==='dashboard' && (
            <div style={{ flex:1, overflow:'auto', padding:'24px 28px' }}>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:22 }}>
                {[
                  { val: contacts.length, label:'Total Contacts', sub:'All time', color:'#4f8ef7' },
                  { val: '$'+collected.toLocaleString(), label:'Revenue Collected', sub:'Paid invoices', color:'#52b788' },
                  { val: campaigns.filter(c=>c.status==='live').length, label:'Live Campaigns', sub:'Currently active', color:'#a78bfa' },
                  { val: messages.length, label:'Messages Handled', sub:'By OPSAI', color:'#f4a237' },
                ].map((s,i) => (
                  <div key={i} className="stat-num" style={{ background:surface, border:`1px solid ${border}`, borderRadius:14, padding:'18px 20px', position:'relative', overflow:'hidden', animationDelay:`${i*0.1}s` }}>
                    <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:s.color, opacity:.6, borderRadius:'14px 14px 0 0' }}></div>
                    <div style={{ fontSize:30, fontWeight:700, letterSpacing:-1, color:s.color, marginBottom:4, marginTop:4 }}>{s.val}</div>
                    <div style={{ fontSize:12, fontWeight:600, color:text, marginBottom:2 }}>{s.label}</div>
                    <div style={{ fontSize:11, color:subtext }}>{s.sub}</div>
                  </div>
                ))}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1.6fr 1fr', gap:16 }}>
                <div style={card()}>
                  <div style={cardHead}>
                    <div style={cardTitle}>Live Activity</div>
                    <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                      <div style={{ width:6, height:6, borderRadius:'50%', background:'#52b788', animation:'pulse-ring 2s ease infinite' }}></div>
                      <div style={{ fontSize:10.5, color:'#52b788', fontWeight:500 }}>Live</div>
                    </div>
                  </div>
                  {activity.map((a,i) => {
                    const dotColor = a.type==='replied'?'#4f8ef7':a.type==='booked'?'#52b788':a.type==='review'?'#a78bfa':'#f4a237'
                    const bgColor = a.type==='replied'?'rgba(79,142,247,0.08)':a.type==='booked'?'rgba(82,183,136,0.08)':a.type==='review'?'rgba(167,139,250,0.08)':'rgba(244,162,55,0.08)'
                    return (
                      <div key={i} className="fade-in" style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'12px 20px', borderBottom:i<activity.length-1?`1px solid ${border}`:'none', animationDelay:`${i*0.05}s` }}>
                        <div style={{ width:28, height:28, borderRadius:8, background:bgColor, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1 }}>
                          <div style={{ width:7, height:7, borderRadius:'50%', background:dotColor }}></div>
                        </div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:12.5, color:text, lineHeight:1.45 }}>{a.description}</div>
                        </div>
                        <div style={{ fontSize:10.5, color:subtext, flexShrink:0, fontWeight:500 }}>{timeAgo(a.created_at)}</div>
                      </div>
                    )
                  })}
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                  <div style={card()}>
                    <div style={cardHead}><div style={cardTitle}>Finance</div></div>
                    <div style={{ padding:'6px 0' }}>
                      {[
                        { label:'Collected', val:'$'+collected.toLocaleString(), color:'#52b788', pct:100 },
                        { label:'Outstanding', val:'$'+outstanding.toLocaleString(), color:'#4f8ef7', pct:60 },
                        { label:'Overdue', val:'$'+overdue.toLocaleString(), color:'#f25f5c', pct:20 },
                      ].map((r,i) => (
                        <div key={i} style={{ padding:'10px 20px', borderBottom:i<2?`1px solid ${border}`:'none' }}>
                          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                            <div style={{ fontSize:12, fontWeight:600, color:text }}>{r.label}</div>
                            <div style={{ fontSize:13, fontWeight:700, color:r.color }}>{r.val}</div>
                          </div>
                          <div style={{ height:3, borderRadius:2, background:border, overflow:'hidden' }}>
                            <div style={{ height:'100%', width:animatedStats?r.pct+'%':'0%', background:r.color, borderRadius:2, opacity:.6, transition:'width 1s ease' }}></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={card()}>
                    <div style={cardHead}>
                      <div style={cardTitle}>Campaigns</div>
                      <button onClick={() => setShowCampaignModal(true)} style={{ fontSize:11, color:'#4f8ef7', background:'none', border:'none', cursor:'pointer', fontFamily:F, fontWeight:600 }}>+ New</button>
                    </div>
                    <div style={{ padding:'4px 0' }}>
                      {campaigns.slice(0,5).map((c,i) => (
                        <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'9px 20px', borderBottom:i<4&&i<campaigns.length-1?`1px solid ${border}`:'none' }}>
                          <div style={{ fontSize:12, color:text, fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:160 }}>{c.name}</div>
                          <span style={{ fontSize:9.5, fontWeight:700, padding:'2px 8px', borderRadius:5, ...sc(c.status), flexShrink:0 }}>{c.status?.toUpperCase()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab==='inbox' && (
            <div style={{ flex:1, display:'flex', overflow:'hidden' }}>
              <div style={{ width:290, borderRight:`1px solid ${border}`, background:surface, overflow:'auto', flexShrink:0 }}>
                <div style={{ padding:'14px 18px', borderBottom:`1px solid ${border}`, fontSize:11, fontWeight:700, color:muted, textTransform:'uppercase', letterSpacing:.5 }}>Conversations</div>
                {contactThreads.map((c,i) => (
                  <div key={i} onClick={() => loadThread(c)} style={{ padding:'14px 18px', borderBottom:`1px solid ${darkMode?'#1f1f28':'#f4f4f7'}`, cursor:'pointer', background: selectedContact?.id===c.id ? 'rgba(79,142,247,0.05)' : surface, borderLeft: selectedContact?.id===c.id ? '3px solid #4f8ef7' : '3px solid transparent' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:text, display:'flex', alignItems:'center', gap:6 }}>
                        {c.name}
                        {c.hasPending && <div className="pulse-badge" style={{ width:6, height:6, borderRadius:'50%', background:'#f25f5c' }}></div>}
                      </div>
                      <div style={{ fontSize:10.5, color:subtext }}>{timeAgo(c.lastMsg.created_at)}</div>
                    </div>
                    <div style={{ marginBottom:5, display:'flex', alignItems:'center', gap:6 }}>
                      <span style={{ fontSize:9.5, fontWeight:700, padding:'2px 7px', borderRadius:5, background:channelColor[c.lastMsg?.channel]+'18', color:channelColor[c.lastMsg?.channel] }}>{c.lastMsg?.channel?.toUpperCase()}</span>
                      <button onClick={e => { e.stopPropagation(); setSlideContact(c) }} style={{ fontSize:9.5, color:muted, background:darkMode?'rgba(255,255,255,0.05)':'rgba(0,0,0,0.04)', border:'none', cursor:'pointer', fontFamily:F, padding:'1px 7px', borderRadius:4 }}>Profile</button>
                    </div>
                    <div style={{ fontSize:12, color:muted, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.lastMsg?.content}</div>
                  </div>
                ))}
              </div>
              <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', background:bg }}>
                {!selectedContact ? (
                  <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:10 }}>
                    <div style={{ fontSize:32, opacity:.15 }}>💬</div>
                    <div style={{ fontSize:13, color:muted }}>Select a conversation</div>
                  </div>
                ) : (
                  <>
                    <div style={{ padding:'16px 22px', background:surface, borderBottom:`1px solid ${border}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                        <div style={{ width:36, height:36, borderRadius:10, background:'#4f8ef7', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:14, color:'white' }}>{selectedContact.name[0]}</div>
                        <div>
                          <div style={{ fontSize:14, fontWeight:700, color:text }}>{selectedContact.name}</div>
                          <div style={{ fontSize:11, color:muted }}>{selectedContact.email}</div>
                        </div>
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <span style={{ fontSize:10.5, fontWeight:600, padding:'4px 12px', borderRadius:6, background:channelColor[thread[0]?.channel]+'18', color:channelColor[thread[0]?.channel] }}>{thread[0]?.channel?.toUpperCase()}</span>
                        <button onClick={() => setSlideContact(selectedContact)} style={{ fontSize:11, color:'#4f8ef7', background:'rgba(79,142,247,0.08)', border:'none', cursor:'pointer', fontFamily:F, padding:'5px 12px', borderRadius:7, fontWeight:600 }}>View Profile</button>
                      </div>
                    </div>
                    <div style={{ flex:1, overflow:'auto', padding:'22px' }}>
                      {thread.map((msg,i) => (
                        <div key={i} className="fade-in" style={{ display:'flex', justifyContent:msg.direction==='outbound'?'flex-end':'flex-start', marginBottom:14, animationDelay:`${i*0.03}s` }}>
                          <div style={{ maxWidth:'72%' }}>
                            {msg.direction==='outbound' && (
                              <div style={{ display:'flex', alignItems:'center', gap:5, justifyContent:'flex-end', marginBottom:5 }}>
                                {msg.ai_generated && <span style={{ fontSize:9.5, fontWeight:700, color:'#4f8ef7', background:'rgba(79,142,247,0.1)', padding:'2px 7px', borderRadius:5 }}>OPSAI</span>}
                                {msg.status==='pending_approval' && <span style={{ fontSize:9.5, fontWeight:700, color:'#f4a237', background:'rgba(244,162,55,0.1)', padding:'2px 7px', borderRadius:5 }}>Pending</span>}
                              </div>
                            )}
                            <div style={{ padding:'11px 15px', borderRadius:msg.direction==='outbound'?'14px 14px 4px 14px':'14px 14px 14px 4px', background:msg.direction==='outbound'?(msg.status==='pending_approval'?'rgba(244,162,55,0.1)':darkMode?'#4f8ef7':'#0e0e10'):surface, border:msg.direction==='outbound'?(msg.status==='pending_approval'?'1.5px solid rgba(244,162,55,0.3)':'none'):`1px solid ${border}`, color:msg.direction==='outbound'?(msg.status==='pending_approval'?'#f4a237':'white'):text, fontSize:13, lineHeight:1.55 }}>{msg.content}</div>
                            <div style={{ fontSize:10.5, color:subtext, marginTop:5, textAlign:msg.direction==='outbound'?'right':'left' }}>{timeAgo(msg.created_at)}</div>
                          </div>
                        </div>
                      ))}
                      {isTyping && (
                        <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:14 }}>
                          <div style={{ padding:'11px 15px', borderRadius:'14px 14px 4px 14px', background:darkMode?'#4f8ef7':'#0e0e10', display:'flex', gap:4, alignItems:'center' }}>
                            {[0,1,2].map(i => <div key={i} style={{ width:4, height:4, borderRadius:'50%', background:'white', opacity:.7, animation:'typing 1s ease infinite', animationDelay:`${i*0.15}s` }}></div>)}
                          </div>
                        </div>
                      )}
                      <div ref={threadEndRef}></div>
                    </div>
                    <div style={{ padding:'14px 22px', background:surface, borderTop:`1px solid ${border}`, display:'flex', gap:10 }}>
                      <input value={replyInput} onChange={e => setReplyInput(e.target.value)} onKeyDown={e => e.key==='Enter' && sendReply()} placeholder="Type a reply... (Enter to send)" style={{ flex:1, padding:'10px 14px', borderRadius:10, border:`1.5px solid ${border}`, fontSize:13, outline:'none', fontFamily:F, background:bg, color:text }}/>
                      <button onClick={sendReply} style={{ padding:'10px 20px', borderRadius:10, background:'#0e0e10', color:'white', border:'none', cursor:'pointer', fontSize:12.5, fontWeight:600, fontFamily:F }}>Send</button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {activeTab==='approvals' && (
            <div style={{ flex:1, overflow:'auto', padding:'24px 28px' }}>
              {pending.length===0 ? (
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'60%', gap:10 }}>
                  <div style={{ fontSize:36, opacity:.15 }}>✓</div>
                  <div style={{ fontSize:13, color:muted }}>No messages waiting for approval</div>
                </div>
              ) : pending.map((msg,i) => {
                const contact = contacts.find(c => c.id===msg.contact_id)
                const isEditing = editingMsg===msg.id
                return (
                  <div key={i} className="fade-in" style={card({ marginBottom:14, animationDelay:`${i*0.08}s` })}>
                    <div style={{ padding:'16px 20px', borderBottom:`1px solid ${border}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <div style={{ width:36, height:36, borderRadius:10, background:'#4f8ef7', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:14, color:'white' }}>{contact?.name?.[0]||'?'}</div>
                        <div>
                          <div style={{ fontSize:13, fontWeight:700, color:text }}>{contact?.name||'Unknown'}</div>
                          <div style={{ fontSize:11, color:muted, marginTop:1 }}>{contact?.email} · {timeAgo(msg.created_at)}</div>
                        </div>
                      </div>
                      <span className="pulse-badge" style={{ fontSize:9.5, fontWeight:700, padding:'3px 9px', borderRadius:5, background:'rgba(244,162,55,0.1)', color:'#f4a237' }}>PENDING APPROVAL</span>
                    </div>
                    <div style={{ padding:'18px 20px' }}>
                      {isEditing ? (
                        <textarea value={editedContent} onChange={e => setEditedContent(e.target.value)} style={{ width:'100%', padding:'13px 15px', borderRadius:10, border:'1.5px solid #4f8ef7', fontSize:13, fontFamily:F, resize:'none', height:130, outline:'none', color:text, background:bg, lineHeight:1.6, marginBottom:14 }}/>
                      ) : (
                        <div style={{ background:bg, borderLeft:'3px solid #f4a237', borderRadius:'0 10px 10px 0', padding:'13px 16px', fontSize:13, color:text, lineHeight:1.65, marginBottom:16 }}>{msg.content}</div>
                      )}
                      <div style={{ display:'flex', gap:8 }}>
                        <button onClick={() => approveMessage(msg.id, isEditing?editedContent:undefined)} style={{ padding:'8px 18px', borderRadius:9, background:'#52b788', color:'white', border:'none', cursor:'pointer', fontSize:12.5, fontWeight:600, fontFamily:F }}>{isEditing?'Approve edited reply':'Approve & Send'}</button>
                        {!isEditing && <button onClick={() => { setEditingMsg(msg.id); setEditedContent(msg.content) }} style={{ padding:'8px 18px', borderRadius:9, background:'transparent', color:'#4f8ef7', border:'1.5px solid rgba(79,142,247,0.3)', cursor:'pointer', fontSize:12.5, fontWeight:600, fontFamily:F }}>Edit first</button>}
                        {isEditing && <button onClick={() => setEditingMsg(null)} style={{ padding:'8px 18px', borderRadius:9, background:bg, color:muted, border:'none', cursor:'pointer', fontSize:12.5, fontFamily:F }}>Cancel</button>}
                        <button onClick={() => discardMessage(msg.id)} style={{ padding:'8px 18px', borderRadius:9, background:'transparent', color:muted, border:`1px solid ${border}`, cursor:'pointer', fontSize:12.5, fontFamily:F }}>Discard</button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {activeTab==='campaigns' && (
            <div style={{ flex:1, overflow:'auto', padding:'24px 28px' }}>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:20 }}>
                {[
                  { val:campaigns.filter(c=>c.status==='live').length, label:'Live', color:'#52b788' },
                  { val:campaigns.reduce((s,c)=>(c.sent_count||0)+s,0).toLocaleString(), label:'Total Sent', color:'#4f8ef7' },
                  { val:campaigns.reduce((s,c)=>(c.conversion_count||0)+s,0).toLocaleString(), label:'Conversions', color:'#f4a237' },
                ].map((s,i) => (
                  <div key={i} className="stat-num" style={{ background:surface, border:`1px solid ${border}`, borderRadius:14, padding:'18px 20px', animationDelay:`${i*0.1}s` }}>
                    <div style={{ fontSize:28, fontWeight:700, letterSpacing:-1, color:s.color, marginBottom:4 }}>{s.val}</div>
                    <div style={{ fontSize:11, color:muted, fontWeight:500, textTransform:'uppercase', letterSpacing:.5 }}>{s.label}</div>
                  </div>
                ))}
              </div>
              <div style={card()}>
                <div style={cardHead}>
                  <div style={cardTitle}>All Campaigns</div>
                  <button onClick={() => setShowCampaignModal(true)} style={{ padding:'7px 16px', borderRadius:8, background:'#0e0e10', color:'white', border:'none', cursor:'pointer', fontSize:12, fontWeight:600, fontFamily:F }}>+ New Campaign</button>
                </div>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead><tr style={{ borderBottom:`1px solid ${border}` }}>{['Name','Type','Sent','Conversions','Status'].map(h=><th key={h} style={{ fontSize:10, color:muted, textTransform:'uppercase', letterSpacing:.8, padding:'10px 18px', textAlign:'left', fontWeight:600 }}>{h}</th>)}</tr></thead>
                  <tbody>{campaigns.map((c,i)=><tr key={i} style={{ borderBottom:`1px solid ${darkMode?'#1f1f28':'#f4f4f7'}` }}><td style={{ padding:'13px 18px', fontSize:13, fontWeight:600, color:text }}>{c.name}</td><td style={{ padding:'13px 18px' }}><span style={{ fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:5, background:'rgba(79,142,247,0.09)', color:'#4f8ef7' }}>{c.type?.toUpperCase()}</span></td><td style={{ padding:'13px 18px', fontSize:13, color:text, fontWeight:500 }}>{(c.sent_count||0).toLocaleString()}</td><td style={{ padding:'13px 18px', fontSize:13, color:'#52b788', fontWeight:500 }}>{(c.conversion_count||0).toLocaleString()}</td><td style={{ padding:'13px 18px' }}><span style={{ fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:5, ...sc(c.status) }}>{c.status?.toUpperCase()}</span></td></tr>)}</tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab==='invoices' && (
            <div style={{ flex:1, overflow:'auto', padding:'24px 28px' }}>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:20 }}>
                {[
                  { val:'$'+collected.toLocaleString(), label:'Collected', sub:'Paid in full', color:'#52b788' },
                  { val:'$'+outstanding.toLocaleString(), label:'Outstanding', sub:'Awaiting payment', color:'#4f8ef7' },
                  { val:'$'+overdue.toLocaleString(), label:'Overdue', sub:'Past due date', color:'#f25f5c' },
                ].map((s,i) => (
                  <div key={i} className="stat-num" style={{ background:surface, border:`1px solid ${border}`, borderRadius:14, padding:'20px 22px', position:'relative', overflow:'hidden', animationDelay:`${i*0.1}s` }}>
                    <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:s.color, opacity:.5, borderRadius:'14px 14px 0 0' }}></div>
                    <div style={{ fontSize:32, fontWeight:700, letterSpacing:-1.5, color:s.color, marginBottom:5, marginTop:4 }}>{s.val}</div>
                    <div style={{ fontSize:13, fontWeight:600, color:text, marginBottom:2 }}>{s.label}</div>
                    <div style={{ fontSize:11, color:subtext }}>{s.sub}</div>
                  </div>
                ))}
              </div>
              <div style={card()}>
                <div style={cardHead}>
                  <div style={cardTitle}>Invoice Ledger</div>
                  <button onClick={() => showToast('New invoice created')} style={{ padding:'7px 16px', borderRadius:8, background:'#0e0e10', color:'white', border:'none', cursor:'pointer', fontSize:12, fontWeight:600, fontFamily:F }}>+ New Invoice</button>
                </div>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead><tr style={{ borderBottom:`1px solid ${border}` }}>{['Client','Service','Amount','Due Date','Status'].map(h=><th key={h} style={{ fontSize:10, color:muted, textTransform:'uppercase', letterSpacing:.8, padding:'10px 18px', textAlign:'left', fontWeight:600 }}>{h}</th>)}</tr></thead>
                  <tbody>{invoices.map((inv,i)=><tr key={i} style={{ borderBottom:`1px solid ${darkMode?'#1f1f28':'#f4f4f7'}` }}><td style={{ padding:'13px 18px' }}><div style={{ display:'flex', alignItems:'center', gap:9 }}><div style={{ width:30, height:30, borderRadius:8, background:'rgba(79,142,247,0.12)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:12, color:'#4f8ef7', flexShrink:0 }}>{inv.client_name?.[0]}</div><div style={{ fontSize:13, fontWeight:600, color:text }}>{inv.client_name}</div></div></td><td style={{ padding:'13px 18px', fontSize:12.5, color:muted }}>{inv.service}</td><td style={{ padding:'13px 18px', fontSize:13, fontWeight:700, color:text }}>${Number(inv.amount).toLocaleString()}</td><td style={{ padding:'13px 18px', fontSize:12, color:inv.status==='overdue'?'#f25f5c':muted, fontWeight:inv.status==='overdue'?600:400 }}>{inv.due_at}</td><td style={{ padding:'13px 18px' }}><span style={{ fontSize:10, fontWeight:700, padding:'3px 9px', borderRadius:5, ...sc(inv.status) }}>{inv.status?.toUpperCase()}</span></td></tr>)}</tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab==='analytics' && (
            <div style={{ flex:1, overflow:'auto', padding:'24px 28px' }}>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:22 }}>
                {[
                  { val:aiReplied, label:'AI Replies Sent', sub:'Total automated', color:'#4f8ef7' },
                  { val:avgResponse > 0 ? avgResponse+'s' : '—', label:'Avg Response Time', sub:'AI-powered replies', color:'#52b788' },
                  { val:campaigns.reduce((s,c)=>(c.sent_count||0)+s,0).toLocaleString(), label:'Campaign Messages', sub:'Sent across all channels', color:'#a78bfa' },
                  { val:campaigns.reduce((s,c)=>(c.conversion_count||0)+s,0).toLocaleString(), label:'Conversions', sub:'From campaigns', color:'#f4a237' },
                ].map((s,i) => (
                  <div key={i} className="stat-num" style={{ background:surface, border:`1px solid ${border}`, borderRadius:14, padding:'18px 20px', position:'relative', overflow:'hidden', animationDelay:`${i*0.1}s` }}>
                    <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:s.color, opacity:.6, borderRadius:'14px 14px 0 0' }}></div>
                    <div style={{ fontSize:30, fontWeight:700, letterSpacing:-1, color:s.color, marginBottom:4, marginTop:4 }}>{s.val}</div>
                    <div style={{ fontSize:12, fontWeight:600, color:text, marginBottom:2 }}>{s.label}</div>
                    <div style={{ fontSize:11, color:subtext }}>{s.sub}</div>
                  </div>
                ))}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:16, marginBottom:16 }}>
                <div style={card()}>
                  <div style={cardHead}>
                    <div style={cardTitle}>Messages by Channel</div>
                    <div style={{ fontSize:10.5, color:muted }}>{messages.length} total</div>
                  </div>
                  <div style={{ padding:'8px 0' }}>
                    {(['instagram','email','sms','web'] as const).map((ch,i) => {
                      const count = messages.filter(m=>m.channel===ch).length
                      const pct = messages.length > 0 ? Math.round((count/messages.length)*100) : 0
                      const color = {instagram:'#e1306c',email:'#4f8ef7',sms:'#52b788',web:'#f4a237'}[ch]
                      const label = {instagram:'Instagram DM',email:'Email',sms:'SMS',web:'Web Form'}[ch]
                      return (
                        <div key={i} style={{ padding:'12px 20px', borderBottom:i<3?`1px solid ${border}`:'none' }}>
                          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                              <div style={{ width:8, height:8, borderRadius:'50%', background:color }}></div>
                              <div style={{ fontSize:13, fontWeight:500, color:text }}>{label}</div>
                            </div>
                            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                              <div style={{ fontSize:12, fontWeight:700, color:text }}>{count}</div>
                              <div style={{ fontSize:11, color:muted, width:32, textAlign:'right' }}>{pct}%</div>
                            </div>
                          </div>
                          <div style={{ height:4, borderRadius:2, background:border, overflow:'hidden' }}>
                            <div style={{ height:'100%', width:animatedStats?pct+'%':'0%', background:color, borderRadius:2, opacity:.7, transition:'width 1.2s ease' }}></div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
                <div style={card()}>
                  <div style={cardHead}><div style={cardTitle}>Response Time</div></div>
                  <div style={{ padding:'8px 0' }}>
                    {[
                      { label:'Under 30 seconds', count:messages.filter(m=>m.response_time_seconds&&m.response_time_seconds<30).length, color:'#52b788' },
                      { label:'30 – 60 seconds', count:messages.filter(m=>m.response_time_seconds&&m.response_time_seconds>=30&&m.response_time_seconds<60).length, color:'#4f8ef7' },
                      { label:'1 – 2 minutes', count:messages.filter(m=>m.response_time_seconds&&m.response_time_seconds>=60&&m.response_time_seconds<120).length, color:'#f4a237' },
                      { label:'Over 2 minutes', count:messages.filter(m=>m.response_time_seconds&&m.response_time_seconds>=120).length, color:'#f25f5c' },
                    ].map((r,i) => (
                      <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'11px 20px', borderBottom:i<3?`1px solid ${border}`:'none' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <div style={{ width:8, height:8, borderRadius:'50%', background:r.color }}></div>
                          <div style={{ fontSize:12.5, color:text }}>{r.label}</div>
                        </div>
                        <div style={{ fontSize:13, fontWeight:700, color:r.count>0?text:muted }}>{r.count}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div style={card({ marginBottom:16 })}>
                <div style={cardHead}>
                  <div style={cardTitle}>Campaign Performance</div>
                  <div style={{ fontSize:10.5, color:muted }}>{campaigns.length} campaigns</div>
                </div>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead><tr style={{ borderBottom:`1px solid ${border}` }}>{['Campaign','Type','Sent','Conversions','Conv. Rate'].map(h=><th key={h} style={{ fontSize:10, color:muted, textTransform:'uppercase', letterSpacing:.8, padding:'10px 18px', textAlign:'left', fontWeight:600 }}>{h}</th>)}</tr></thead>
                  <tbody>{campaigns.map((c,i)=>{
                    const rate = c.sent_count>0?Math.round((c.conversion_count/c.sent_count)*100):0
                    return <tr key={i} style={{ borderBottom:`1px solid ${darkMode?'#1f1f28':'#f4f4f7'}` }}><td style={{ padding:'13px 18px', fontSize:13, fontWeight:600, color:text }}>{c.name}</td><td style={{ padding:'13px 18px' }}><span style={{ fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:5, background:'rgba(79,142,247,0.09)', color:'#4f8ef7' }}>{c.type?.toUpperCase()}</span></td><td style={{ padding:'13px 18px', fontSize:13, color:text, fontWeight:500 }}>{(c.sent_count||0).toLocaleString()}</td><td style={{ padding:'13px 18px', fontSize:13, color:'#52b788', fontWeight:500 }}>{(c.conversion_count||0).toLocaleString()}</td><td style={{ padding:'13px 18px' }}><div style={{ display:'flex', alignItems:'center', gap:8 }}><div style={{ height:4, width:60, borderRadius:2, background:border, overflow:'hidden' }}><div style={{ height:'100%', width:animatedStats?rate+'%':'0%', background:rate>10?'#52b788':rate>5?'#f4a237':'#f25f5c', borderRadius:2, transition:'width 1.2s ease' }}></div></div><div style={{ fontSize:12, fontWeight:700, color:rate>10?'#52b788':rate>5?'#f4a237':muted }}>{rate}%</div></div></td></tr>
                  })}</tbody>
                </table>
              </div>
              <div style={card()}>
                <div style={cardHead}><div style={cardTitle}>OPSAI Activity Summary</div></div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)' }}>
                  {[
                    { label:'DMs Replied', val:activity.filter(a=>a.type==='replied').length, color:'#4f8ef7', desc:'Automated responses sent' },
                    { label:'Carts Recovered', val:activity.filter(a=>a.type==='booked').length, color:'#52b788', desc:'Abandoned orders completed' },
                    { label:'Reviews Requested', val:activity.filter(a=>a.type==='review').length, color:'#a78bfa', desc:'Post-delivery requests sent' },
                  ].map((s,i) => (
                    <div key={i} className="stat-num" style={{ padding:'22px 24px', borderRight:i<2?`1px solid ${border}`:'none', animationDelay:`${i*0.1}s` }}>
                      <div style={{ fontSize:36, fontWeight:700, letterSpacing:-2, color:s.color, marginBottom:6 }}>{s.val}</div>
                      <div style={{ fontSize:13, fontWeight:600, color:text, marginBottom:3 }}>{s.label}</div>
                      <div style={{ fontSize:11.5, color:muted }}>{s.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab==='settings' && (
            <div style={{ flex:1, overflow:'auto', padding:'24px 28px' }}>
              <div style={{ maxWidth:540 }}>
                <div style={card()}>
                  <div style={cardHead}><div style={cardTitle}>Business Settings</div></div>
                  <div style={{ padding:'20px', display:'flex', flexDirection:'column', gap:16 }}>
                    {[{label:'Business Name',key:'name'},{label:'Owner Name',key:'owner_name'},{label:'Location',key:'location'},{label:'Store Link',key:'booking_link'},{label:'Hours',key:'hours'}].map(field => (
                      <div key={field.key}>
                        <div style={{ fontSize:11, fontWeight:700, color:text, textTransform:'uppercase', letterSpacing:.5, marginBottom:6 }}>{field.label}</div>
                        <input style={{ width:'100%', padding:'10px 14px', borderRadius:10, border:`1.5px solid ${border}`, fontSize:13, outline:'none', fontFamily:F, color:text, background:bg }} value={business[field.key]||''} onChange={e => setBusiness({...business,[field.key]:e.target.value})}/>
                      </div>
                    ))}
                    <div>
                      <div style={{ fontSize:11, fontWeight:700, color:text, textTransform:'uppercase', letterSpacing:.5, marginBottom:6 }}>Products</div>
                      <textarea style={{ width:'100%', padding:'10px 14px', borderRadius:10, border:`1.5px solid ${border}`, fontSize:13, outline:'none', fontFamily:F, color:text, height:110, resize:'none', background:bg }} value={business.services||''} onChange={e => setBusiness({...business,services:e.target.value})}/>
                    </div>
                    <button onClick={async () => { await supabase.from('businesses').update(business).eq('id',business.id); showToast('Settings saved') }} style={{ width:'fit-content', padding:'10px 22px', borderRadius:10, cursor:'pointer', fontSize:13, fontWeight:600, fontFamily:F, background:'#0e0e10', color:'white', border:'none' }}>Save Settings</button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}