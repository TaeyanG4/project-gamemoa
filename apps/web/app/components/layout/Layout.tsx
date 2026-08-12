import { useState, type ReactNode } from "react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { Footer } from "./Footer";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col w-full selection:bg-brand/30 selection:text-text-primary bg-surface text-text-primary">
      <Header onToggleMobileSidebar={() => setIsMobileSidebarOpen((prev) => !prev)} />

      <div className="flex-1 flex w-full">
        <Sidebar
          isMobileOpen={isMobileSidebarOpen}
          onMobileClose={() => setIsMobileSidebarOpen(false)}
        />

        <main className="flex-1 w-full min-w-0 flex flex-col">{children}</main>
      </div>

      <Footer />
    </div>
  );
}
