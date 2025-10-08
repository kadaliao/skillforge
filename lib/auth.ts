import NextAuth from "next-auth"
import GitHub from "next-auth/providers/github"
import Credentials from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "./prisma"

const isDev = process.env.NODE_ENV === "development"

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID!,
      clientSecret: process.env.AUTH_GITHUB_SECRET!,
    }),
    // Dev-only: Simple test login (no password required)
    ...(isDev ? [
      Credentials({
        id: "dev-login",
        name: "开发测试",
        credentials: {
          email: { label: "邮箱", type: "email", placeholder: "test@dev.local" },
        },
        async authorize(credentials) {
          if (!credentials?.email) return null

          // Find or create test user
          let user = await prisma.user.findUnique({
            where: { email: credentials.email as string },
          })

          if (!user) {
            user = await prisma.user.create({
              data: {
                email: credentials.email as string,
                name: "测试用户",
              },
            })
          }

          return user
        },
      }),
    ] : []),
  ],
  session: {
    strategy: "jwt", // Use JWT instead of database sessions (works in edge runtime)
  },
  callbacks: {
    async jwt({ token, user }) {
      // Add user ID to token on first sign in
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      // Add user ID from token to session
      if (session.user && token.id) {
        session.user.id = token.id as string
      }
      return session
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
})
