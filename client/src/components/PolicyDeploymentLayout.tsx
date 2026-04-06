/**
 * PolicyDeploymentLayout — Standard DashboardLayout for the Policy Deployment service.
 *
 * Follows the identical pattern used by SQDCP, OEE Manager, and Action Manager:
 *   - Sidebar with route-based navigation
 *   - SharedPageHeader with service name, hierarchy breadcrumb, and ReportingToolbar
 *   - HierarchyProvider for enterprise/site context
 *
 * This replaces the previous custom sidebar/header that was embedded in Home.tsx.
 */
import { useAuth } from "@/_core/hooks/useAuth";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  useSidebar,
} from "@pablo2410/shared-ui/primitives";
import { useIsMobile } from "@/hooks/useMobile";
import SharedPageHeader from "@/components/SharedPageHeader";
import ReportingToolbar from "@/components/ReportingToolbar";
import { HierarchyProvider } from "@/contexts/HierarchyContext";
import {
  LayoutGrid,
  Grid3X3,
  BarChart3,
  FolderKanban,
  GitBranchPlus,
  Target,
  Settings,
  Plug,
  PanelLeft,
  ArrowLeft,
  FileStack,
} from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

/* ── Sidebar menu items — maps to routes under /app/policy-deployment ── */

const BASE = "";

const menuItems = [
  { icon: LayoutGrid, label: "Dashboard", path: "/" },
  { icon: Grid3X3, label: "X-Matrix", path: `${BASE}/xmatrix` },
  { icon: BarChart3, label: "Bowling Chart", path: `${BASE}/bowling` },
  { icon: FolderKanban, label: "Action Plans", path: `${BASE}/actions` },
  { icon: GitBranchPlus, label: "Catchball", path: `${BASE}/catchball` },
  { icon: Target, label: "Deployments", path: `${BASE}/deployments` },
];

const adminMenuItems = [
  { icon: Settings, label: "Manage Policy", path: `${BASE}/manage` },
  { icon: Plug, label: "Integrations", path: `${BASE}/integrations` },
];

/* ── Layout Component ── */

function PolicyDeploymentSidebar({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const { toggleSidebar, state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const isAdmin =
    
    user?.role === "platform_admin";

  const activeMenuItem =
    [...menuItems, ...adminMenuItems].find((item) =>
      item.path === BASE ? location === BASE : location.startsWith(item.path)
    );

  /* ── Report / feedback handlers ── */
  const handleReportSubmit = (data: any) => {
    toast.success(`${data.type} report submitted`, {
      description: `Severity: ${data.severity} — ${data.location}`,
    });
  };
  const handleFeedbackSubmit = (data: any) => {
    toast.success(`${data.type} feedback submitted`, {
      description: data.subject,
    });
  };

  return (
    <>
      <Sidebar collapsible="icon" className="border-r-0">
          <SidebarHeader className="h-16 justify-center">
            <div className="flex items-center gap-3 px-2 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-accent rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              {!isCollapsed ? (
                <div className="flex items-center gap-2 min-w-0">
                  <FileStack className="h-5 w-5 text-[#8C34E9] shrink-0" />
                  <span className="font-semibold tracking-tight truncate">
                    Policy Deployment
                  </span>
                </div>
              ) : null}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0">
            {/* Back to Service Hub */}
            <SidebarMenu className="px-2 pt-2 pb-1">
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => { window.location.href = "https://portal.oplytics.digital/app"; }}
                  tooltip="Back to Service Hub"
                  className="h-10 transition-all font-normal text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Service Hub</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>

            {/* Main navigation */}
            <div className="px-4 py-2">
              {!isCollapsed && (
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Analysis
                </span>
              )}
            </div>
            <SidebarMenu className="px-2 py-1">
              {menuItems.map((item) => {
                const isActive =
                  item.path === BASE
                    ? location === BASE
                    : location.startsWith(item.path);
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={item.label}
                      className="h-10 transition-all font-normal"
                    >
                      <item.icon
                        className={`h-4 w-4 ${isActive ? "text-primary" : ""}`}
                      />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>

            {/* Admin-only section */}
            {isAdmin && (
              <>
                <div className="px-4 py-2 mt-2">
                  {!isCollapsed && (
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Administration
                    </span>
                  )}
                </div>
                <SidebarMenu className="px-2 py-1">
                  {adminMenuItems.map((item) => {
                    const isActive = location.startsWith(item.path);
                    return (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton
                          isActive={isActive}
                          onClick={() => setLocation(item.path)}
                          tooltip={item.label}
                          className="h-10 transition-all font-normal"
                        >
                          <item.icon
                            className={`h-4 w-4 ${isActive ? "text-primary" : ""}`}
                          />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </>
            )}
          </SidebarContent>

          {/* Footer */}
          <SidebarFooter className="p-2">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setLocation("/settings")}
                  tooltip="Settings"
                  className="h-10 transition-all font-normal text-muted-foreground hover:text-foreground"
                >
                  <Settings className="h-4 w-4" />
                  <span>Settings</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <SharedPageHeader
          serviceName={activeMenuItem?.label ?? "Policy Deployment"}
          serviceIcon={<FileStack className="h-4 w-4" />}
          showHierarchy={true}
          hierarchyMaxDepth={5}
          showSidebarTrigger={true}
          rightSlot={
            <ReportingToolbar
              moduleName="Policy Deployment"
              onReportSubmit={handleReportSubmit}
              onFeedbackSubmit={handleFeedbackSubmit}
              defaultLocation=""
            />
          }
        />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </>
  );
}

/* ── Exported wrapper with providers ── */

export default function PolicyDeploymentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const isMobile = useIsMobile();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <HierarchyProvider>
      <SidebarProvider defaultOpen={!isMobile}>
        <PolicyDeploymentSidebar>{children}</PolicyDeploymentSidebar>
      </SidebarProvider>
    </HierarchyProvider>
  );
}
