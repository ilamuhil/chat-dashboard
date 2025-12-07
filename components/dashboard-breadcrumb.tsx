"use client"

import { usePathname } from "next/navigation"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

// Map routes to their display titles
const routeTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/overview": "Overview",
  "/dashboard/bot/interactions": "Interactions",
  "/dashboard/bot/training": "Training Data",
  "/dashboard/bot/api": "API Setup",
  "/dashboard/users/conversations": "Conversations",
  "/dashboard/users/leads": "Leads",
  "/dashboard/analytics": "Analytics",
  "/dashboard/profile": "Profile",
  "/dashboard/subscription": "Subscription",
}

// Map parent routes for breadcrumb hierarchy
const parentRoutes: Record<string, { title: string; url: string } | null> = {
  "/dashboard/overview": null,
  "/dashboard/bot/interactions": { title: "Bot Configuration", url: "/dashboard/bot" },
  "/dashboard/bot/training": { title: "Bot Configuration", url: "/dashboard/bot" },
  "/dashboard/bot/api": { title: "Bot Configuration", url: "/dashboard/bot" },
  "/dashboard/users/conversations": { title: "Users", url: "/dashboard/users" },
  "/dashboard/users/leads": { title: "Users", url: "/dashboard/users" },
  "/dashboard/analytics": null,
  "/dashboard/profile": null,
  "/dashboard/subscription": null,
}

export function DashboardBreadcrumb() {
  const pathname = usePathname()
  const currentTitle = routeTitles[pathname] || "Dashboard"
  const parent = parentRoutes[pathname]

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem className="hidden md:block">
          <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
        </BreadcrumbItem>
        {parent && (
          <>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem className="hidden md:block">
              <BreadcrumbLink href={parent.url}>{parent.title}</BreadcrumbLink>
            </BreadcrumbItem>
          </>
        )}
        <BreadcrumbSeparator className="hidden md:block" />
        <BreadcrumbItem>
          <BreadcrumbPage>{currentTitle}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  )
}

