import { auth } from '@/lib/auth/config'

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const isAuthPage =
    req.nextUrl.pathname.startsWith('/login') ||
    req.nextUrl.pathname.startsWith('/register') ||
    req.nextUrl.pathname.startsWith('/forgot-password') ||
    req.nextUrl.pathname.startsWith('/reset-password') ||
    req.nextUrl.pathname.startsWith('/verify-email')

  if (!isLoggedIn && !isAuthPage) {
    return Response.redirect(new URL('/login', req.nextUrl))
  }
})

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}