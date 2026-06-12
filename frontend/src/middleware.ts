import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const publicRoutes = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
]

const parentRoutes = ['/dashboard/parent']
const childRoutes = ['/dashboard/child']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check for auth token in cookie
  const accessToken = request.cookies.get('access_token')?.value
  const authHeader = request.headers.get('authorization')
  const isAuthenticated = !!accessToken || !!authHeader

  // Allow public routes
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    // If already authenticated and trying to access login, redirect to dashboard
    if (isAuthenticated && (pathname === '/login' || pathname === '/register')) {
      const redirectUrl = request.nextUrl.searchParams.get('redirect') || '/dashboard'
      return NextResponse.redirect(new URL(redirectUrl, request.url))
    }
    return NextResponse.next()
  }

  // Allow API routes, static files, and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/images') ||
    pathname === '/'
  ) {
    return NextResponse.next()
  }

  if (!isAuthenticated) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Parse user info from cookie if available
  let userRole: string | null = null
  try {
    const userCookie = request.cookies.get('user')?.value
    if (userCookie) {
      const user = JSON.parse(userCookie)
      userRole = user.role
    }
  } catch {
    // Ignore parse errors
  }

  // Role-based route protection
  if (pathname.startsWith('/dashboard/parent')) {
    if (userRole && userRole !== 'parent' && userRole !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard/child', request.url))
    }
  }

  if (pathname.startsWith('/dashboard/child')) {
    if (userRole && userRole !== 'child' && userRole !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard/parent', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images (public images)
     * - All files with extensions (e.g. .js, .css, .png)
     */
    '/((?!_next/static|_next/image|favicon.ico|images|.*\\.(?:js|css|png|jpg|jpeg|gif|svg|ico|webp|woff2?)$).*)',
  ],
}
