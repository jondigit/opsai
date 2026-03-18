import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const { businessName, ownerName, clientName, invoiceNumber, amount, service, daysOverdue } = await req.json()

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 300,
    system: 'You write professional, empathetic invoice follow-up emails. Write ONLY the email content — no preamble.',
    messages: [{
      role: 'user',
      content: `Draft a polite invoice follow-up.\nBusiness: ${businessName}\nOwner: ${ownerName}\nClient: ${clientName}\nInvoice #${invoiceNumber} for $${amount} (${service})\nDays overdue: ${daysOverdue}\n\nInclude subject line prefixed "Subject: ", warm opening, polite mention of invoice, [PAY LINK] placeholder, professional close. Under 100 words. ${daysOverdue > 5 ? 'Be slightly firmer but still respectful.' : 'Keep tone friendly.'}`
    }],
  })

  return NextResponse.json({ draft: response.content[0].type === 'text' ? response.content[0].text : '' })
}
