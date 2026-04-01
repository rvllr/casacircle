import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import NotificationBell from "@/components/NotificationBell";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Separator } from "@/components/ui/separator";
import DemoBanner from "@/components/DemoBanner";
import { useActiveSpace } from "@/contexts/ActiveSpaceContext";

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
}

const AppLayout = ({ children, title }: AppLayoutProps) => {
  const { activeLabel, activeType } = useActiveSpace();
  return (
    <SidebarProvider>
      <div className="min-h-screen flex flex-col w-full bg-background">
        <DemoBanner />
        <div className="flex flex-1">
          <AppSidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <header className="h-14 flex items-center gap-3 border-b border-border/60 bg-card/50 backdrop-blur-sm px-4 sticky top-0 z-30">
              <SidebarTrigger className="hover:bg-secondary/60 rounded-lg" />
              {title && (
                <>
                  <Separator orientation="vertical" className="h-5 mx-1" />
                  <h1 className="font-display text-base text-foreground/80 truncate flex-1">
                    {title}
                    {activeType && (
                      <span className="text-muted-foreground font-normal text-sm ml-2">— {activeLabel}</span>
                    )}
                  </h1>
                </>
              )}
              <div className="ml-auto flex items-center gap-1">
                <ThemeToggle />
                <NotificationBell />
              </div>
            </header>
            <main className="flex-1 p-4 sm:p-5 md:p-8 overflow-auto">
              {children}
            </main>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AppLayout;
