"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, Upload, Settings, ChevronLeft } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { SettingsModal } from "../common/settings-modal";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/patients", label: "Patients", icon: Users },
  { href: "/upload", label: "Upload", icon: Upload },
];

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showText, setShowText] = useState(!isCollapsed);

  useEffect(() => {
    if (isCollapsed) {
      setShowText(false);
    } else {
      const timer = setTimeout(() => setShowText(true), 150);
      return () => clearTimeout(timer);
    }
  }, [isCollapsed]);

  return (
    <>
      <aside 
        className={`fixed left-0 top-0 h-screen border-r border-border bg-card flex flex-col transition-all duration-300 ${
          isCollapsed ? "w-16" : "w-56"
        }`}
      >
        {/* Logo */}
        <div className="h-14 flex items-center border-b border-border px-4">
          <Link href="/patients" className={`flex items-center ${isCollapsed ? "justify-center w-full" : ""}`}>
            <Logo size="sm" showText={showText} />
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 overflow-hidden">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center h-9 px-3 text-sm transition-colors rounded-md whitespace-nowrap overflow-hidden ${
                      isActive
                        ? "bg-secondary text-secondary-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    } ${isCollapsed ? "justify-center" : "gap-3"}`}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {showText && <span>{item.label}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Settings */}
        <div className="p-3 border-t border-border">
          <button
            onClick={() => setSettingsOpen(true)}
            className={`flex items-center h-9 px-3 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors rounded-md w-full whitespace-nowrap overflow-hidden ${
              isCollapsed ? "justify-center" : "gap-3"
            }`}
            title={isCollapsed ? "Settings" : undefined}
          >
            <Settings className="h-4 w-4 shrink-0" />
            {showText && <span>Settings</span>}
          </button>
        </div>

        {/* Collapse Toggle Button */}
        <div className={`p-2 border-t border-border flex ${isCollapsed ? "justify-center" : "justify-end"}`}>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="h-7 w-7 p-0"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <ChevronLeft 
              className={`h-4 w-4 transition-transform duration-300 ${
                isCollapsed ? "rotate-180" : ""
              }`} 
            />
          </Button>
        </div>
      </aside>

      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}
