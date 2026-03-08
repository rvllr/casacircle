import { Home, LayoutDashboard, Building2, CalendarDays, BookOpen, Receipt, User, LogOut, Wrench } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

const menuItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Maisons", url: "/houses", icon: Building2 },
  { title: "Réservations", url: "/bookings", icon: CalendarDays },
  { title: "Journal", url: "/journal", icon: BookOpen },
  { title: "Dépenses", url: "/expenses", icon: Receipt },
  { title: "Maintenance", url: "/maintenance", icon: Wrench },
  { title: "Profil", url: "/profile", icon: User },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { signOut, user } = useAuth();

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="p-4 flex items-center gap-2">
          <Home className="h-6 w-6 text-primary flex-shrink-0" />
          {!collapsed && <span className="font-display text-lg text-foreground truncate">Maison Commune</span>}
        </div>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/dashboard"}
                      className="flex items-center gap-3 px-3 py-2 rounded-md text-muted-foreground hover:bg-muted/50 transition-colors"
                      activeClassName="bg-primary/10 text-primary font-medium"
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3">
        {!collapsed && user && (
          <p className="text-xs text-muted-foreground truncate mb-2 px-1">{user.email}</p>
        )}
        <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground" onClick={signOut}>
          <LogOut className="h-4 w-4 flex-shrink-0" />
          {!collapsed && <span>Déconnexion</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
