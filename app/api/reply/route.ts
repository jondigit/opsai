import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const { businessName, ownerName, services, hours, bookingLink, messages } = await req.json()

  const system = `You are the AI back-office operator for ${businessName}, owned by ${ownerName}.
Services: ${services}
Hours: ${hours}
Booking link: ${bookingLink}
Respond warmly, professionally, and concisely. Never make up information.
If a message involves complaints, refunds, or disputes, say you are passing it to ${ownerName} immediately.
Keep replies under 3 sentences unless more detail is clearly needed.`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 500,
    system,
    messages,
  })

  return NextResponse.json({ reply: response.content[0].type === 'text' ? response.content[0].text : '' })
}
