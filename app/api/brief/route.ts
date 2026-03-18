import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const { businessName, ownerName, activityLog } = await req.json()

  const log = activityLog?.length
    ? activityLog.map((a: string) => `- ${a}`).join('\n')
    : '- Sent 12 appointment reminders (11 confirmed)\n- Responded to 6 new leads, 4 booked\n- Sent re-engagement email to 38 clients, 3 booked\n- Generated 2 invoices\n- Sent 1 overdue payment reminder'

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 400,
    system: 'You write concise daily operations briefs for small business owners. Be direct, warm, and useful.',
    messages: [{
      role: 'user',
      content: `Write a daily brief for ${ownerName}, owner of ${businessName}.\n\nActivity:\n${log}\n\nWrite:\n1. A 2-3 sentence summary starting with "Here is what we did for you today:"\n2. Then "Three things that need your attention:" followed by exactly 3 numbered items.\n\nUnder 160 words total.`
    }],
  })

  return NextResponse.json({ brief: response.content[0].type === 'text' ? response.content[0].text : '' })
}
