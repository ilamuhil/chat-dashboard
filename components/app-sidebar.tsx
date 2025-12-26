"use client";

import * as React from "react";
import {
  GalleryVerticalEnd,
  Wallet,
  MonitorCog,
  MessageCircleMore,
  Users,
  LayoutDashboard,
  UserRoundPen,
} from "lucide-react";

import { NavMain } from "@/components/nav-main";
// import { NavProjects } from "@/components/nav-projects"
import { NavUser } from "@/components/nav-user";
import { TeamSwitcher } from "@/components/team-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import type { User } from "@supabase/supabase-js";

type Profile = {
  full_name: string | null;
} | null;

const data = {
  teams: [
    {
      name: "Acme Inc",
      logo: GalleryVerticalEnd,
      plan: "Enterprise",
    },
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
          title: "Conversations",
          url: "/dashboard/users/conversations",
        },
        {
          title: "Leads",
          url: "/dashboard/users/leads",
          icon: Users,
        },
      ],
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
};

export function AppSidebar({
  user,
  profile,
  ...props
}: React.ComponentProps<typeof Sidebar> & { user: User; profile?: Profile }) {
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
        <NavUser user={user} profile={profile} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
