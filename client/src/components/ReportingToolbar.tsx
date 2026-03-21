/**
 * ReportingToolbar — Reusable component for Oplytics platform services.
 * 
 * Provides two groups of quick-action buttons in the top-right:
 * 1. User reporting: Safety / Environmental / Stop Work incident reporting
 * 2. Platform feedback: Problem / Suggestion reporting for Oplytics team
 * 
 * This component is designed to be deployed across all Oplytics subdomains.
 * See /home/ubuntu/skills/oplytics-reporting-toolbar/SKILL.md for integration guide.
 */
import { useState } from "react";
import {
  Button,
  Badge,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Input,
  Label,
} from "@pablo2410/shared-ui/primitives";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@pablo2410/shared-ui/primitives";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@pablo2410/shared-ui/primitives";
import {
  ShieldAlert,
  Leaf,
  OctagonX,
  Bug,
  Lightbulb,
  ChevronDown,
  Send,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ──────────────────────────────────────────────────
export type ReportType = "safety" | "environmental" | "stop_work";
export type FeedbackType = "problem" | "suggestion";

interface ReportData {
  type: ReportType;
  severity: "critical" | "high" | "medium" | "low";
  location: string;
  description: string;
  immediateAction?: string;
}

interface FeedbackData {
  type: FeedbackType;
  subject: string;
  description: string;
  module: string;
}

interface ReportingToolbarProps {
  /** The current module/service name (e.g., "SQDCP", "OEE Manager") */
  moduleName?: string;
  /** Callback when a safety/environmental/stop-work report is submitted */
  onReportSubmit?: (report: ReportData) => void | Promise<void>;
  /** Callback when a problem/suggestion is submitted */
  onFeedbackSubmit?: (feedback: FeedbackData) => void | Promise<void>;
  /** Optional: current user's location/area for pre-filling */
  defaultLocation?: string;
}

const REPORT_TYPES: { type: ReportType; label: string; icon: typeof ShieldAlert; color: string; description: string }[] = [
  { type: "safety", label: "Safety Incident", icon: ShieldAlert, color: "#EF4444", description: "Report a safety hazard, near miss, or injury" },
  { type: "environmental", label: "Environmental", icon: Leaf, color: "#22C55E", description: "Report an environmental concern or spill" },
  { type: "stop_work", label: "Stop Work", icon: OctagonX, color: "#F59E0B", description: "Raise a stop work authority — immediate halt" },
];

const SEVERITY_OPTIONS = [
  { value: "critical", label: "Critical", color: "#EF4444" },
  { value: "high", label: "High", color: "#F59E0B" },
  { value: "medium", label: "Medium", color: "#3b82f6" },
  { value: "low", label: "Low", color: "#22C55E" },
];

export default function ReportingToolbar({
  moduleName = "SQDCP",
  onReportSubmit,
  onFeedbackSubmit,
  defaultLocation = "",
}: ReportingToolbarProps) {
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [selectedReportType, setSelectedReportType] = useState<ReportType>("safety");
  const [selectedFeedbackType, setSelectedFeedbackType] = useState<FeedbackType>("problem");
  const [submitting, setSubmitting] = useState(false);

  // Report form state
  const [reportSeverity, setReportSeverity] = useState<string>("medium");
  const [reportLocation, setReportLocation] = useState(defaultLocation);
  const [reportDescription, setReportDescription] = useState("");
  const [reportImmediateAction, setReportImmediateAction] = useState("");

  // Feedback form state
  const [feedbackSubject, setFeedbackSubject] = useState("");
  const [feedbackDescription, setFeedbackDescription] = useState("");

  const openReportDialog = (type: ReportType) => {
    setSelectedReportType(type);
    setReportSeverity(type === "stop_work" ? "critical" : "medium");
    setReportLocation(defaultLocation);
    setReportDescription("");
    setReportImmediateAction("");
    setReportDialogOpen(true);
  };

  const openFeedbackDialog = (type: FeedbackType) => {
    setSelectedFeedbackType(type);
    setFeedbackSubject("");
    setFeedbackDescription("");
    setFeedbackDialogOpen(true);
  };

  const handleReportSubmit = async () => {
    if (!reportDescription.trim()) {
      toast.error("Please provide a description");
      return;
    }
    setSubmitting(true);
    try {
      const report: ReportData = {
        type: selectedReportType,
        severity: reportSeverity as ReportData["severity"],
        location: reportLocation,
        description: reportDescription,
        immediateAction: reportImmediateAction || undefined,
      };
      if (onReportSubmit) {
        await onReportSubmit(report);
      }
      toast.success("Report submitted successfully", {
        description: selectedReportType === "stop_work"
          ? "Stop Work authority raised — management has been notified"
          : "Your report has been logged and assigned for review",
      });
      setReportDialogOpen(false);
    } catch {
      toast.error("Failed to submit report. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleFeedbackSubmit = async () => {
    if (!feedbackDescription.trim()) {
      toast.error("Please provide a description");
      return;
    }
    setSubmitting(true);
    try {
      const feedback: FeedbackData = {
        type: selectedFeedbackType,
        subject: feedbackSubject,
        description: feedbackDescription,
        module: moduleName,
      };
      if (onFeedbackSubmit) {
        await onFeedbackSubmit(feedback);
      }
      toast.success(
        selectedFeedbackType === "problem"
          ? "Problem reported — Oplytics team will review"
          : "Suggestion submitted — thank you for your feedback",
      );
      setFeedbackDialogOpen(false);
    } catch {
      toast.error("Failed to submit feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const reportConfig = REPORT_TYPES.find((r) => r.type === selectedReportType);

  return (
    <>
      {/* Toolbar buttons */}
      <div className="flex items-center gap-2">
        {/* Safety / Environmental / Stop Work dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 gap-1.5 text-xs font-medium text-[#EF4444] hover:bg-[#EF4444]/10 hover:text-[#EF4444] border border-[#EF4444]/20"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Report</span>
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {REPORT_TYPES.map((rt) => (
              <DropdownMenuItem
                key={rt.type}
                onClick={() => openReportDialog(rt.type)}
                className="gap-3 py-2.5"
              >
                <rt.icon className="h-4 w-4" style={{ color: rt.color }} />
                <div>
                  <p className="text-sm font-medium">{rt.label}</p>
                  <p className="text-[10px] text-muted-foreground">{rt.description}</p>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Feedback dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 gap-1.5 text-xs font-medium text-[#8C34E9] hover:bg-[#8C34E9]/10 hover:text-[#8C34E9] border border-[#8C34E9]/20"
            >
              <Lightbulb className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Feedback</span>
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem onClick={() => openFeedbackDialog("problem")} className="gap-3 py-2.5">
              <Bug className="h-4 w-4 text-[#EF4444]" />
              <div>
                <p className="text-sm font-medium">Report Problem</p>
                <p className="text-[10px] text-muted-foreground">Something isn't working</p>
              </div>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => openFeedbackDialog("suggestion")} className="gap-3 py-2.5">
              <Lightbulb className="h-4 w-4 text-[#8C34E9]" />
              <div>
                <p className="text-sm font-medium">Suggestion</p>
                <p className="text-[10px] text-muted-foreground">Idea for improvement</p>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Report Dialog */}
      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {reportConfig && (
                <reportConfig.icon className="h-5 w-5" style={{ color: reportConfig.color }} />
              )}
              {reportConfig?.label || "Report"}
              {selectedReportType === "stop_work" && (
                <Badge className="bg-[#F59E0B] text-white text-[9px] border-0">URGENT</Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              {reportConfig?.description}. All reports are logged and tracked.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs font-medium">Severity</Label>
              <Select value={reportSeverity} onValueChange={setReportSeverity}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEVERITY_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                        {s.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium">Location / Area</Label>
              <Input
                value={reportLocation}
                onChange={(e) => setReportLocation(e.target.value)}
                placeholder="e.g., Production Line 3, Warehouse B"
                className="h-9"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium">Description *</Label>
              <Textarea
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                placeholder="Describe what happened or what you observed..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium">Immediate Action Taken</Label>
              <Textarea
                value={reportImmediateAction}
                onChange={(e) => setReportImmediateAction(e.target.value)}
                placeholder="Describe any immediate action taken to make the area safe..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReportDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleReportSubmit}
              disabled={submitting || !reportDescription.trim()}
              className="gap-2"
              style={{
                backgroundColor: reportConfig?.color,
                color: "white",
              }}
            >
              <Send className="h-3.5 w-3.5" />
              {submitting ? "Submitting..." : "Submit Report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Feedback Dialog */}
      <Dialog open={feedbackDialogOpen} onOpenChange={setFeedbackDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedFeedbackType === "problem" ? (
                <Bug className="h-5 w-5 text-[#EF4444]" />
              ) : (
                <Lightbulb className="h-5 w-5 text-[#8C34E9]" />
              )}
              {selectedFeedbackType === "problem" ? "Report a Problem" : "Submit a Suggestion"}
            </DialogTitle>
            <DialogDescription>
              {selectedFeedbackType === "problem"
                ? "Help us fix issues — describe what went wrong."
                : "We'd love to hear your ideas for improving Oplytics."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs font-medium">Subject</Label>
              <Input
                value={feedbackSubject}
                onChange={(e) => setFeedbackSubject(e.target.value)}
                placeholder={selectedFeedbackType === "problem" ? "Brief summary of the issue" : "Brief summary of your idea"}
                className="h-9"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium">Description *</Label>
              <Textarea
                value={feedbackDescription}
                onChange={(e) => setFeedbackDescription(e.target.value)}
                placeholder={
                  selectedFeedbackType === "problem"
                    ? "What were you trying to do? What happened instead?"
                    : "Describe your suggestion and how it would help..."
                }
                rows={5}
              />
            </div>

            <div className="text-[10px] text-muted-foreground">
              Module: {moduleName} — Feedback is reviewed by the Oplytics team
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFeedbackDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleFeedbackSubmit}
              disabled={submitting || !feedbackDescription.trim()}
              className="gap-2"
              style={{
                backgroundColor: selectedFeedbackType === "problem" ? "#EF4444" : "#8C34E9",
                color: "white",
              }}
            >
              <Send className="h-3.5 w-3.5" />
              {submitting ? "Submitting..." : "Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
