import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { businessName, channel, contactName, message, services } = body

    // Return a placeholder reply until Anthropic API key is added
    const reply = `Hi ${contactName || 'there'}, thanks for reaching out to ${businessName || 'us'}! We received your message and will get back to you shortly.`

    return NextResponse.json({ data: reply })
  } catch (err) {
    return NextResponse.json({ data: 'Thank you for your message. We will be in touch soon.' })
  }
}