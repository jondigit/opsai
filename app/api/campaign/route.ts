import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const { businessName, services, bookingLink, goal, type } = await req.json()

  const guides: Record<string, string> = {
    email: 'Write a marketing email. First line must be "Subject: [subject]". Then the body. Under 180 words. Personal and warm.',
    sms: 'Write an SMS under 160 characters. Include the business name. Direct and warm.',
    instagram: 'Write an Instagram caption with a strong first line and 6-8 hashtags at the end. Under 200 words.',
  }

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 600,
    system: 'You write high-converting marketing copy for small businesses. Write ONLY the campaign content — no preamble or explanation.',
    messages: [{
      role: 'user',
      content: `${guides[type] || guides.email}\n\nBusiness: ${businessName}\nGoal: ${goal}\nServices: ${services}\nBooking: ${bookingLink}`
    }],
  })

  return NextResponse.json({ content: response.content[0].type === 'text' ? response.content[0].text : '' })
}
