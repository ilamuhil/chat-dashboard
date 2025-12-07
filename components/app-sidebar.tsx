"use client"

import * as React from "react"
import {
  GalleryVerticalEnd,
  Wallet,
  MonitorCog,
  MessageCircleMore,
  ChartNoAxesCombined,
  Users,
  LayoutDashboard,
  UserRoundPen,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
// import { NavProjects } from "@/components/nav-projects"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"

// This is sample data.
const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  teams: [
    {
      name: "Acme Inc",
      logo: GalleryVerticalEnd,
      plan: "Enterprise",
    }
  ],
  navMain: [
    {
      title: "Overview",
      url: "/dashboard/overview",
      icon: LayoutDashboard,
    },
    {
      title: "Bot Configuration",
      icon: MonitorCog,
      isActive: true,
      items: [
        {
          title: "Interactions",
          url: "/dashboard/bot/interactions",
        },
        {
          title: "Training Data",
          url: "/dashboard/bot/training",
        },
        {
          title: "API Setup",
          url: "/dashboard/bot/api",
        },
      ],
    },
    {
      title: "Users",
      icon: MessageCircleMore,
      isActive: true,
      items: [
        {
          title:"Conversations",
          url: "/dashboard/users/conversations",
        },
        {
          title: "Leads",
          url: "/dashboard/users/leads",
          icon: Users,
        }
      ]
    },
    {
      title: "Analytics",
      url: "/dashboard/analytics",
      icon: ChartNoAxesCombined,
    },
    {
      title: "Profile",
      url: "/dashboard/profile",
      icon: UserRoundPen,
    },
    {
      title: "Subscription",
      url: "/dashboard/subscription",
      icon: Wallet,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        {/* <NavProjects projects={data.projects} /> */}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
