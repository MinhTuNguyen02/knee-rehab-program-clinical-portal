"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Activity, Users, ClipboardList, List, X, MessagesSquare } from "lucide-react";
import { useTransition } from "react";
import UserMenu from "@/components/ui/UserMenu";

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: Activity },
    { name: "Leads", href: "/leads", icon: Users },
    { name: "Assessments", href: "/assessments", icon: ClipboardList },
    { name: "Messages", href: "/messages", icon: MessagesSquare },
  ];

  return (
    <div className="flex min-h-[100dvh] bg-background">
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/80 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 transform border-r border-slate-200 bg-white transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 dark:border-slate-800 dark:bg-slate-950 ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-16 items-center justify-between px-6 border-b border-slate-200 dark:border-slate-800">
          <div className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
            <span className="text-primary">KRPS Clinical Portal</span>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden p-2 -mr-2 text-slate-500 hover:text-slate-900 dark:hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 p-4">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${isActive
                  ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-hover"
                  : "text-slate-700 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                  }`}
              >
                <item.icon
                  size={20}
                  height={isActive ? "fill" : "regular"}
                  className={isActive ? "text-primary" : "text-slate-400 group-hover:text-slate-500"}
                />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="flex h-16 flex-shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8 dark:border-slate-800 dark:bg-slate-950">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 -ml-2 text-slate-500 hover:text-slate-900 lg:hidden dark:hover:text-white"
          >
            <List size={24} />
          </button>

          <div className="ml-auto">
            <div className="flex items-center gap-3 pl-4 border-l border-gray-200 dark:border-gray-800">
              <UserMenu />
              {/* <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" /> */}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto bg-background p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
