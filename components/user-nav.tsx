import { auth, signOut } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { prisma } from "@/lib/prisma"
import Link from "next/link"

export async function UserNav() {
  const session = await auth()

  if (!session?.user) {
    return (
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost">
          <Link href="/auth/signin">Sign In</Link>
        </Button>
      </div>
    )
  }

  const user = session.user

  // Fetch user stats for gamification display
  const userStats = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      totalXP: true,
      level: true,
      currentStreak: true,
    },
  })

  return (
    <TooltipProvider>
      <div className="flex items-center gap-4">
        {/* User Stats */}
        {userStats && (
          <div className="hidden md:flex items-center gap-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5 cursor-help">
                  <Badge variant="secondary" className="font-semibold">
                    Lv {userStats.level}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {userStats.totalXP.toLocaleString()} XP
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Your total level across all skill trees</p>
              </TooltipContent>
            </Tooltip>
            {userStats.currentStreak > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 text-sm cursor-help">
                    <span>🔥</span>
                    <span className="font-semibold">{userStats.currentStreak}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Day streak: Complete tasks daily to maintain!</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        )}

      {/* User Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-10 w-10 rounded-full">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user.image || undefined} alt={user.name || "User"} />
              <AvatarFallback>{user.name?.[0] || user.email?.[0] || "U"}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.name}</p>
            <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard">Dashboard</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/achievements">🏆 Achievements</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <form
            action={async () => {
              "use server"
              await signOut({ redirectTo: "/" })
            }}
          >
            <button type="submit" className="w-full text-left">
              Sign out
            </button>
          </form>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
      </div>
    </TooltipProvider>
  )
}
