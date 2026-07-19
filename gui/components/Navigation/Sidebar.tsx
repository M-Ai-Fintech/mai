import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export interface NavGroup {
  title: string;
  items: {
    label: string;
    href: string;
    badge?: string;
    subItems?: { label: string; href: string }[];
  }[];
}

export interface SidebarProps {
  groups?: NavGroup[];
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

const defaultNavGroups: NavGroup[] = [
  {
    title: "MAIN",
    items: [
      { label: "Dashboard", href: "/" },
      { label: "Clients", href: "/clients" },
      { label: "Generative UI Studio", href: "/generative-ui", badge: "NEW" },
    ],
  },
  {
    title: "DEALS & OPERATIONS",
    items: [
      {
        label: "Active Transactions",
        href: "/",
        subItems: [
          { label: "Sourcing & KYB", href: "/#sourcing" },
          { label: "Due Diligence", href: "/#dd" },
          { label: "Negotiation", href: "/#negotiation" },
        ],
      },
    ],
  },
  {
    title: "SYSTEM",
    items: [{ label: "Settings", href: "/settings" }],
  },
];

export const Sidebar: React.FC<SidebarProps> = ({
  groups = defaultNavGroups,
  isCollapsed = false,
  onToggleCollapse,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const pathname = usePathname();
  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({
    "Active Transactions": true,
  });

  const toggleSubmenu = (label: string) => {
    setOpenSubmenus((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <>
      {/* Backdrop for Mobile */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-ink-black/60 backdrop-blur-sm md:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        aria-label="Main Navigation"
        className={`h-screen sticky top-0 bg-ink-black text-canvas-cream border-r border-ink-black/20 flex flex-col justify-between transition-all duration-300 z-50 select-none text-left ${
          isCollapsed ? "w-20" : "w-64"
        } ${
          isMobileOpen
            ? "fixed inset-y-0 left-0 translate-x-0"
            : "max-md:-translate-x-full max-md:fixed max-md:inset-y-0 max-md:left-0"
        }`}
      >
      {/* Brand Header */}
      <div className="p-5 border-b border-dust-taupe/20 flex justify-between items-center">
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-signal-orange"></span>
            <span className="font-bold text-lg tracking-tight text-white">
              M&Ai Fintech
            </span>
          </div>
        )}
        <button
          onClick={onToggleCollapse}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="text-dust-taupe hover:text-white p-1 rounded transition-colors text-xs cursor-pointer"
        >
          {isCollapsed ? "➔" : "◀"}
        </button>
      </div>

      {/* Nav Groups list */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {groups.map((group, gIdx) => (
          <div key={gIdx} className="space-y-2">
            {!isCollapsed && (
              <h4 className="text-[10px] font-bold text-dust-taupe/70 uppercase tracking-widest px-3">
                {group.title}
              </h4>
            )}
            <div className="space-y-1">
              {group.items.map((item, iIdx) => {
                const isActive = pathname === item.href;
                const hasSub = item.subItems && item.subItems.length > 0;
                const isSubOpen = openSubmenus[item.label];

                return (
                  <div key={iIdx} className="space-y-1">
                    <div
                      className={`flex items-center justify-between px-3 py-2.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                        isActive
                          ? "bg-signal-orange text-white font-bold"
                          : "text-canvas-cream/80 hover:bg-white/10 hover:text-white"
                      }`}
                      onClick={() => hasSub && toggleSubmenu(item.label)}
                    >
                      <Link href={item.href} className="flex-1">
                        {item.label}
                      </Link>

                      {item.badge && !isCollapsed && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-white text-ink-black ml-2">
                          {item.badge}
                        </span>
                      )}

                      {hasSub && !isCollapsed && (
                        <span className="text-[10px] ml-2">
                          {isSubOpen ? "▲" : "▼"}
                        </span>
                      )}
                    </div>

                    {/* Submenu rendering */}
                    {hasSub && isSubOpen && !isCollapsed && (
                      <div className="pl-4 space-y-1 border-l border-dust-taupe/20 ml-4 my-1">
                        {item.subItems!.map((sub, sIdx) => (
                          <Link
                            key={sIdx}
                            href={sub.href}
                            className="block px-3 py-1.5 rounded-full text-xs text-dust-taupe hover:text-white hover:bg-white/5 transition-all"
                          >
                            • {sub.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer Info */}
      {!isCollapsed && (
        <div className="p-4 border-t border-dust-taupe/20 text-[11px] text-dust-taupe/60">
          M&Ai Middleware v1.0.0 (Deno + ADK)
        </div>
      )}
    </aside>
  </>
);
};
