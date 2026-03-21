/**
 * SharedPageHeader — standardised header bar for all Oplytics subdomains.
 *
 * Layout:
 *   LEFT:   Service icon/name + HierarchyNavigator breadcrumb
 *   CENTRE: (reserved slot for future use)
 *   RIGHT:  ReportingToolbar + Enterprise badge + User avatar/menu
 *
 * Oplytics dark theme: #0D1220 bg, #1E2738 border, #8C34E9 accent
 */
import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback, SidebarTrigger } from "@pablo2410/shared-ui/primitives";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@pablo2410/shared-ui/primitives";
import { useIsMobile } from "@/hooks/useMobile";
import HierarchyNavigator from "@/components/HierarchyNavigator";
import { useHierarchy } from "@/contexts/HierarchyContext";
import { LogOut, User, Settings, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/* ── Props ── */

interface SharedPageHeaderProps {
  /** Service name displayed in the header (e.g., "SQDCP", "OEE Manager") */
  serviceName?: string;
  /** Service icon element (lucide icon or custom SVG) */
  serviceIcon?: ReactNode;
  /** Maximum hierarchy depth to show (default: 5 = all levels) */
  hierarchyMaxDepth?: number;
  /** Content for the right slot (before user avatar). Defaults to ReportingToolbar. */
  rightSlot?: ReactNode;
  /** Content for the centre slot (reserved for future use) */
  centreSlot?: ReactNode;
  /** Whether to show the sidebar trigger on mobile */
  showSidebarTrigger?: boolean;
  /** Whether to show the hierarchy navigator */
  showHierarchy?: boolean;
  /** Additional CSS classes for the header container */
  className?: string;
  /** Link to navigate back to portal */
  portalUrl?: string;
}

/* ── User Menu ── */

function UserMenu() {
  const { user, logout } = useAuth();

  if (!user) return null;

  const initials = (user.name || "U")
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-[#1E2738] transition-colors outline-none focus-visible:ring-1 focus-visible:ring-[#8C34E9]">
          <Avatar className="h-7 w-7 border border-[#2A2A3E]">
            <AvatarFallback className="text-[10px] font-medium bg-[#8C34E9]/20 text-[#C084FC]">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="hidden md:block text-xs text-[#E2E8F0] truncate max-w-[100px]">
            {user.name || "User"}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-48 bg-[#0D1220] border-[#1E2738]"
      >
        <div className="px-3 py-2 border-b border-[#1E2738]">
          <p className="text-xs font-medium text-[#E2E8F0] truncate">{user.name}</p>
          <p className="text-[10px] text-[#596475] truncate">{user.email || user.role}</p>
        </div>
        <DropdownMenuItem className="text-xs text-[#E2E8F0] hover:bg-[#1E2738] cursor-pointer focus:bg-[#1E2738]">
          <User className="h-3.5 w-3.5 mr-2 text-[#8890A0]" />
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem className="text-xs text-[#E2E8F0] hover:bg-[#1E2738] cursor-pointer focus:bg-[#1E2738]">
          <Settings className="h-3.5 w-3.5 mr-2 text-[#8890A0]" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-[#1E2738]" />
        <DropdownMenuItem
          onClick={() => logout()}
          className="text-xs text-[#EF4444] hover:bg-[#EF4444]/10 cursor-pointer focus:bg-[#EF4444]/10 focus:text-[#EF4444]"
        >
          <LogOut className="h-3.5 w-3.5 mr-2" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ── Enterprise Badge ── */

function EnterpriseBadge() {
  const { selection } = useHierarchy();

  if (!selection.enterprise) return null;

  return (
    <div className="hidden lg:flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#8C34E9]/10 border border-[#8C34E9]/20">
      <div className="h-4 w-4 rounded-sm bg-[#8C34E9]/30 flex items-center justify-center">
        <span className="text-[8px] font-bold text-[#C084FC]">
          {selection.enterprise.name.charAt(0).toUpperCase()}
        </span>
      </div>
      <span className="text-[10px] font-medium text-[#C084FC] truncate max-w-[80px]">
        {selection.enterprise.code || selection.enterprise.name}
      </span>
    </div>
  );
}

/* ── Main Component ── */

export default function SharedPageHeader({
  serviceName,
  serviceIcon,
  hierarchyMaxDepth = 5,
  rightSlot,
  centreSlot,
  showSidebarTrigger = true,
  showHierarchy = true,
  className,
  portalUrl,
}: SharedPageHeaderProps) {
  const isMobile = useIsMobile();

  return (
    <header
      className={cn(
        "flex items-center justify-between h-14 px-4",
        "bg-[#0D1220]/95 border-b border-[#1E2738]",
        "backdrop-blur supports-[backdrop-filter]:backdrop-blur",
        "sticky top-0 z-40",
        className
      )}
    >
      {/* ── LEFT: Sidebar trigger + Service name + Hierarchy ── */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {showSidebarTrigger && isMobile && (
          <SidebarTrigger className="h-9 w-9 rounded-lg bg-background shrink-0" />
        )}

        {/* Service name/icon */}
        {serviceName && (
          <div className="flex items-center gap-1.5 shrink-0">
            {serviceIcon && (
              <span className="text-[#8C34E9]">{serviceIcon}</span>
            )}
            <span className="text-sm font-semibold text-[#E2E8F0] hidden sm:block">
              {serviceName}
            </span>
            {showHierarchy && (
              <span className="text-[#596475] hidden sm:block">/</span>
            )}
          </div>
        )}

        {/* Hierarchy navigator */}
        {showHierarchy && (
          <div className="min-w-0 overflow-x-auto scrollbar-none">
            <HierarchyNavigator
              compact={isMobile}
              maxDepth={isMobile ? 3 : hierarchyMaxDepth}
            />
          </div>
        )}
      </div>

      {/* ── CENTRE: Reserved slot ── */}
      {centreSlot && (
        <div className="hidden lg:flex items-center justify-center flex-shrink-0 mx-4">
          {centreSlot}
        </div>
      )}

      {/* ── RIGHT: Reporting toolbar + Enterprise badge + Portal link + User menu ── */}
      <div className="flex items-center gap-2 shrink-0">
        {rightSlot}

        <EnterpriseBadge />

        {portalUrl && (
          <a
            href={portalUrl}
            className="hidden md:flex items-center gap-1 px-2 py-1 rounded-md text-[10px] text-[#8890A0] hover:text-[#E2E8F0] hover:bg-[#1E2738] transition-colors"
            title="Back to Portal"
          >
            <ExternalLink className="h-3 w-3" />
            <span>Portal</span>
          </a>
        )}

        <div className="w-px h-6 bg-[#1E2738] hidden md:block" />

        <UserMenu />
      </div>
    </header>
  );
}
