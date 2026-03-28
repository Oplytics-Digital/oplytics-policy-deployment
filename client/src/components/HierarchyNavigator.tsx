/**
 * HierarchyNavigator — breadcrumb-style hierarchy switcher.
 *
 * Displays: Enterprise / BU / Site / Area / Asset
 * Each level is a clickable dropdown to switch context.
 * Platform admins can switch enterprises; others see their scoped enterprise.
 *
 * Oplytics dark theme: #0A0E1A bg, #8C34E9 accent, #E2E8F0 text, #8890A0 muted
 */
import { useHierarchy, type HierarchyNode } from "@/contexts/HierarchyContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@pablo2410/shared-ui/primitives";
import { ChevronRight, ChevronDown, Building2, Network, MapPin, LayoutGrid, Box } from "lucide-react";
import { cn } from "@/lib/utils";

/* ── Level config ── */

interface LevelConfig {
  key: string;
  label: string;
  icon: React.ElementType;
  getNodes: () => HierarchyNode[];
  getSelected: () => HierarchyNode | null;
  onSelect: (node: HierarchyNode | null) => void;
  canSwitch?: boolean;
}

/* ── Single breadcrumb level ── */

function BreadcrumbLevel({
  config,
  isLast,
  compact,
}: {
  config: LevelConfig;
  isLast: boolean;
  compact?: boolean;
}) {
  const nodes = config.getNodes();
  const selected = config.getSelected();
  const Icon = config.icon;
  const canSwitch = config.canSwitch !== false;
  const hasMultiple = nodes.length > 1;

  if (!selected) return null;

  // If only one option or can't switch, show as static text
  if (!hasMultiple || !canSwitch) {
    return (
      <div className="flex items-center gap-1">
        <div
          className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded-md text-sm",
            "text-[#E2E8F0]",
            compact && "px-1.5 py-0.5 text-xs"
          )}
        >
          <Icon className={cn("shrink-0 text-[#8890A0]", compact ? "h-3 w-3" : "h-3.5 w-3.5")} />
          <span className="truncate max-w-[120px]">{selected.name}</span>
        </div>
        {!isLast && (
          <ChevronRight className={cn("shrink-0 text-[#596475]", compact ? "h-3 w-3" : "h-3.5 w-3.5")} />
        )}
      </div>
    );
  }

  // Multiple options — show as dropdown
  return (
    <div className="flex items-center gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded-md text-sm",
              "text-[#E2E8F0] hover:bg-[#1E2738] hover:text-white",
              "transition-colors cursor-pointer outline-none",
              "focus-visible:ring-1 focus-visible:ring-[#8C34E9]",
              compact && "px-1.5 py-0.5 text-xs"
            )}
          >
            <Icon className={cn("shrink-0 text-[#8890A0]", compact ? "h-3 w-3" : "h-3.5 w-3.5")} />
            <span className="truncate max-w-[120px]">{selected.name}</span>
            <ChevronDown className={cn("shrink-0 text-[#596475]", compact ? "h-2.5 w-2.5" : "h-3 w-3")} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="min-w-[180px] max-h-[300px] overflow-y-auto bg-[#0D1220] border-[#1E2738]"
        >
          {nodes.map((node) => (
            <DropdownMenuItem
              key={node.id}
              onClick={() => config.onSelect(node)}
              className={cn(
                "text-sm text-[#E2E8F0] hover:bg-[#1E2738] hover:text-white cursor-pointer",
                "focus:bg-[#1E2738] focus:text-white",
                selected.id === node.id && "bg-[#8C34E9]/10 text-[#C084FC]"
              )}
            >
              <Icon className="h-3.5 w-3.5 mr-2 shrink-0 text-[#8890A0]" />
              <span className="truncate">{node.name}</span>
              {node.code && (
                <span className="ml-auto text-xs text-[#596475] pl-2">{node.code}</span>
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {!isLast && (
        <ChevronRight className={cn("shrink-0 text-[#596475]", compact ? "h-3 w-3" : "h-3.5 w-3.5")} />
      )}
    </div>
  );
}

/* ── Drill-down prompt ── */

function DrillDownPrompt({
  label,
  icon: Icon,
  nodes,
  onSelect,
  compact,
}: {
  label: string;
  icon: React.ElementType;
  nodes: HierarchyNode[];
  onSelect: (node: HierarchyNode) => void;
  compact?: boolean;
}) {
  if (nodes.length === 0) return null;

  return (
    <div className="flex items-center gap-1">
      <ChevronRight className={cn("shrink-0 text-[#596475]", compact ? "h-3 w-3" : "h-3.5 w-3.5")} />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded-md text-sm",
              "text-[#596475] hover:bg-[#1E2738] hover:text-[#8890A0]",
              "transition-colors cursor-pointer outline-none",
              "border border-dashed border-[#2A2A3E] hover:border-[#596475]",
              compact && "px-1.5 py-0.5 text-xs"
            )}
          >
            <Icon className={cn("shrink-0", compact ? "h-3 w-3" : "h-3.5 w-3.5")} />
            <span className="truncate">Select {label}</span>
            <ChevronDown className={cn("shrink-0", compact ? "h-2.5 w-2.5" : "h-3 w-3")} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="min-w-[180px] max-h-[300px] overflow-y-auto bg-[#0D1220] border-[#1E2738]"
        >
          {nodes.map((node) => (
            <DropdownMenuItem
              key={node.id}
              onClick={() => onSelect(node)}
              className="text-sm text-[#E2E8F0] hover:bg-[#1E2738] hover:text-white cursor-pointer focus:bg-[#1E2738] focus:text-white"
            >
              <Icon className="h-3.5 w-3.5 mr-2 shrink-0 text-[#8890A0]" />
              <span className="truncate">{node.name}</span>
              {node.code && (
                <span className="ml-auto text-xs text-[#596475] pl-2">{node.code}</span>
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

/* ── Main component ── */

interface HierarchyNavigatorProps {
  /** Show in compact mode (smaller text, tighter spacing) */
  compact?: boolean;
  /** Maximum depth to show (default: all 5 levels) */
  maxDepth?: number;
  /** CSS class for the container */
  className?: string;
}

export default function HierarchyNavigator({
  compact = false,
  maxDepth = 5,
  className,
}: HierarchyNavigatorProps) {
  const ctx = useHierarchy();

  if (ctx.loading) {
    return (
      <div className={cn("flex items-center gap-2 animate-pulse", className)}>
        <div className="h-6 w-24 rounded bg-[#1E2738]" />
        <ChevronRight className="h-3.5 w-3.5 text-[#596475]" />
        <div className="h-6 w-20 rounded bg-[#1E2738]" />
      </div>
    );
  }

  // Build the level configs
  const levels: LevelConfig[] = [
    {
      key: "enterprise",
      label: "Enterprise",
      icon: Building2,
      getNodes: () => ctx.enterprises,
      getSelected: () => ctx.selection.enterprise,
      onSelect: ctx.selectEnterprise,
      canSwitch: ctx.canSwitchEnterprise,
    },
    {
      key: "businessUnit",
      label: "Business Unit",
      icon: Network,
      getNodes: () => ctx.businessUnits,
      getSelected: () => ctx.selection.businessUnit,
      onSelect: ctx.selectBusinessUnit,
    },
    {
      key: "site",
      label: "Site",
      icon: MapPin,
      getNodes: () => ctx.sites,
      getSelected: () => ctx.selection.site,
      onSelect: ctx.selectSite,
    },
    {
      key: "area",
      label: "Area",
      icon: LayoutGrid,
      getNodes: () => ctx.areas,
      getSelected: () => ctx.selection.area,
      onSelect: ctx.selectArea,
    },
    {
      key: "asset",
      label: "Asset",
      icon: Box,
      getNodes: () => ctx.assets,
      getSelected: () => ctx.selection.asset,
      onSelect: ctx.selectAsset,
    },
  ].slice(0, maxDepth);

  // Determine which levels are selected and which is the next drill-down
  const selectedLevels = levels.filter((l) => l.getSelected() !== null);
  const nextLevel = levels.find((l) => l.getSelected() === null && l.getNodes().length > 0);

  return (
    <nav
      className={cn("flex items-center flex-wrap gap-0.5", className)}
      aria-label="Hierarchy navigation"
    >
      {selectedLevels.map((level, idx) => (
        <BreadcrumbLevel
          key={level.key}
          config={level}
          isLast={idx === selectedLevels.length - 1 && !nextLevel}
          compact={compact}
        />
      ))}
      {nextLevel && (
        <DrillDownPrompt
          label={nextLevel.label}
          icon={nextLevel.icon}
          nodes={nextLevel.getNodes()}
          onSelect={nextLevel.onSelect}
          compact={compact}
        />
      )}
      {selectedLevels.length === 0 && !nextLevel && (
        <span className="text-sm text-[#596475] italic">No hierarchy data available</span>
      )}
    </nav>
  );
}
