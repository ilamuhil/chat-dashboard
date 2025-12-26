"use client";

import { ChevronRight, type LucideIcon } from "lucide-react";
import Link from "next/link";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { usePathname, useRouter } from "next/navigation";

export function NavMain({
  items,
}: {
  items: {
    title: string;
    url?: string;
    icon?: LucideIcon;
    isActive?: boolean;
    items?: {
      title: string;
      url: string;
    }[];
  }[];
}) {
  const router = useRouter();
  const pathname = usePathname();

  // Check if any sub-item is active
  const isSubItemActive = (subItems?: { url: string }[]) => {
    if (!subItems) return false;
    return subItems.some(
      (subItem) =>
        pathname === subItem.url || pathname.startsWith(subItem.url + "/")
    );
  };

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Platform</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          const hasActiveSubItem = isSubItemActive(item.items);
          const isParentActive = pathname === item.url || hasActiveSubItem;

          return (
            <Collapsible
              key={item.title}
              asChild
              defaultOpen={item.isActive || hasActiveSubItem}
              className="group/collapsible"
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton
                    isActive={isParentActive}
                    tooltip={item.title}
                    onClick={() => {
                      if (
                        item?.url &&
                        (!item.items || item.items.length === 0)
                      ) {
                        router.push(item.url);
                      }
                    }}
                    className="cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 data-[active=true]:bg-gray-200 dark:data-[active=true]:bg-gray-700"
                  >
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                    {item?.items?.length ? (
                      <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    ) : null}
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                {item.items && item.items.length > 0 ? (
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.items.map((subItem) => {
                        const isSubActive =
                          pathname === subItem.url ||
                          pathname.startsWith(subItem.url + "/");
                        return (
                          <SidebarMenuSubItem key={subItem.title}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={isSubActive}
                              className="hover:bg-gray-200 dark:hover:bg-gray-700 data-[active=true]:bg-gray-200 dark:data-[active=true]:bg-gray-700"
                            >
                              <Link href={subItem.url}>
                                <span>{subItem.title}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        );
                      })}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                ) : null}
              </SidebarMenuItem>
            </Collapsible>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
