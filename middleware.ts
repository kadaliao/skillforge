import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isAuthenticated = !!req.auth

  // Protect dashboard and user-specific routes
  if (pathname.startsWith("/dashboard") && !isAuthenticated) {
    return NextResponse.redirect(new URL("/auth/signin", req.url))
  }

  // Protect API routes that modify user data
  if (pathname.startsWith("/api/ai/generate-tree") && !isAuthenticated) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/ai/generate-tree/:path*",
    "/api/ai/generate-tree-stream/:path*",
  ],
}
