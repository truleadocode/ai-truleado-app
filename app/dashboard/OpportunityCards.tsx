'use client'

import { useState } from 'react'

const PLATFORM_ICONS: Record<string, string> = {
  instagram: '📸', tiktok: '🎵', youtube: '▶️', pinterest: '📌',
}

export default function OpportunityCards({ opportunities, influencerId }: { opportunities: any[]; influencerId: string }) {
  const [items, setItems] = useState(opportunities)
  const [deciding, setDeciding] = useState<string | null>(null)

  async function respond(matchId: string, response: 'yes' | 'no') {
    setDeciding(matchId)
    try {
      await fetch('/api/influencer/respond-opportunity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ match_id: matchId, influencer_id: influencerId, response }),
      })
      // Remove from list with a small delay for feedback
      setItems(prev => prev.filter(o => o.id !== matchId))
    } catch (e) {
      console.error(e)
    } finally {
      setDeciding(null)
    }
  }

  if (items.length === 0) return null

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <p style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.1px', color: 'var(--text)' }}>
          New opportunities
        </p>
        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: 'var(--gold)', color: '#fff' }}>{items.length}</span>
      </div>

      {items.map(opp => {
        const brief = opp.brief
        const platforms: string[] = brief?.platforms || []
        const budget = brief?.budget_flexible
          ? 'Flexible budget'
          : brief?.budget_per_creator_eur
            ? `Around €${Math.round(brief.budget_per_creator_eur / 100)}`
            : null

        return (
          <div key={opp.id} style={{ background: 'var(--white)', border: '1px solid var(--gold-border)', borderRadius: 'var(--radius-lg, 14px)', padding: '18px 20px', marginBottom: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--gold-bg)', border: '1.5px solid var(--gold-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'var(--gold)' }}>SC</div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>New opportunity from Sarah</p>
                <p style={{ fontSize: 11, color: 'var(--text-3)' }}>Brand hidden until you accept</p>
              </div>
            </div>

            <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6, marginBottom: 12 }}>
              {opp.outreach_message}
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
              {platforms.map(p => (
                <span key={p} style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>
                  {PLATFORM_ICONS[p] || '📱'} {p.charAt(0).toUpperCase() + p.slice(1)}
                </span>
              ))}
              {brief?.content_types?.length > 0 && (
                <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>
                  {brief.content_types.join(', ')}
                </span>
              )}
              {budget && (
                <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20, background: 'var(--green-bg)', border: '1px solid var(--green-border)', color: 'var(--green)', fontWeight: 600 }}>
                  {budget}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => respond(opp.id, 'yes')}
                disabled={deciding === opp.id}
                style={{ flex: 2, padding: '10px', borderRadius: 8, background: 'var(--gold)', color: '#fff', fontSize: 13, fontWeight: 700, border: 'none', cursor: deciding === opp.id ? 'default' : 'pointer', fontFamily: 'inherit', opacity: deciding === opp.id ? 0.7 : 1 }}
              >
                {deciding === opp.id ? 'Sending…' : "I'm interested"}
              </button>
              <button
                onClick={() => respond(opp.id, 'no')}
                disabled={deciding === opp.id}
                style={{ flex: 1, padding: '10px', borderRadius: 8, background: 'var(--surface)', color: 'var(--text-2)', fontSize: 13, fontWeight: 600, border: '1px solid var(--border)', cursor: deciding === opp.id ? 'default' : 'pointer', fontFamily: 'inherit' }}
              >
                Not for me
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
