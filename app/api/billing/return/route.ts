import { NextRequest, NextResponse } from 'next/server'
function destination(request: NextRequest) {
  const url = new URL(
    '/dashboard/subscription',
    process.env.APP_URL || request.url,
  )
  const checkout = request.nextUrl.searchParams.get('checkout')
  if (checkout && /^[\da-f-]{36}$/.test(checkout))
    url.searchParams.set('checkout', checkout)
  // Return data is not proof of payment. The signed-in page reconciles with
  // Cashfree using the checkout's stored organization and provider identifiers.
  return NextResponse.redirect(url, 303)
}
export async function GET(request: NextRequest) {
  return destination(request)
}
export async function POST(request: NextRequest) {
  return destination(request)
}
