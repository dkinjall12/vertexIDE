"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BookOpen,
  Code2,
  Compass,
  FolderPlus,
  History,
  Home,
  LayoutDashboard,
  Lightbulb,
  Plus,
  Settings,
  Star,
  Terminal,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarGroupAction,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import Image from "next/image"

// Mock data for playground boards with icons
const mockPlaygrounds = [
  { id: "react-playground", name: "React Playground", starred: true, icon: Zap },
  { id: "vue-playground", name: "Vue Playground", starred: false, icon: Compass },
  { id: "angular-playground", name: "Angular Playground", starred: false, icon: Terminal },
  { id: "svelte-playground", name: "Svelte Playground", starred: true, icon: Lightbulb },
]

export function DashboardSidebar() {
  const pathname = usePathname()
  const [starredPlaygrounds, setStarredPlaygrounds] = useState(mockPlaygrounds.filter((p) => p.starred))
  const [recentPlaygrounds, setRecentPlaygrounds] = useState(mockPlaygrounds)

  return (
    <Sidebar variant="inset" collapsible="icon" className="border-1 border-r" >
      <SidebarHeader>
        <div className="flex items-center gap-2 px-4 py-3 justify-center">
            <Image src={"/logo.svg"} alt="logo" height={60} width={60} />
        </div>
        <Button variant="brand" className="mx-4 mb-2 justify-start gap-2">
          <Plus className="h-4 w-4" />
          New Playground
        </Button>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === "/"} tooltip="Home">
                <Link href="/">
                  <Home className="h-4 w-4" />
                  <span>Home</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === "/dashboard"} tooltip="Dashboard">
                <Link href="/dashboard">
                  <LayoutDashboard className="h-4 w-4" />
                  <span>Dashboard</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === "/explore"} tooltip="Explore">
                <Link href="/explore">
                  <Compass className="h-4 w-4" />
                  <span>Explore</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
           
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>
            <Star className="h-4 w-4 mr-2" />
            Starred
          </SidebarGroupLabel>
          <SidebarGroupAction title="Add starred playground">
            <Plus className="h-4 w-4" />
          </SidebarGroupAction>
          <SidebarGroupContent>
            <SidebarMenu>
              {starredPlaygrounds.map((playground) => (
                <SidebarMenuItem key={playground.id}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === `/playground/${playground.id}`}
                    tooltip={playground.name}
                  >
                    <Link href={`/playground/${playground.id}`}>
                      <playground.icon className="h-4 w-4" />
                      <span>{playground.name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>
            <History className="h-4 w-4 mr-2" />
            Recent
          </SidebarGroupLabel>
          <SidebarGroupAction title="Create new playground">
            <FolderPlus className="h-4 w-4" />
          </SidebarGroupAction>
          <SidebarGroupContent>
            <SidebarMenu>
              {recentPlaygrounds.map((playground) => (
                <SidebarMenuItem key={playground.id}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === `/playground/${playground.id}`}
                    tooltip={playground.name}
                  >
                    <Link href={`/playground/${playground.id}`}>
                      <playground.icon className="h-4 w-4" />
                      <span>{playground.name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="View all">
                  <Link href="/playgrounds">
                    <span className="text-sm text-muted-foreground">View all playgrounds</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Settings">
              <Link href="/settings">
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
