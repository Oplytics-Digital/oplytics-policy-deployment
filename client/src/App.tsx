import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { PolicyProvider } from "./contexts/PolicyContext";
import PolicyDeploymentLayout from "./components/PolicyDeploymentLayout";

// Page components
import PolicyDashboard from "./pages/policy/PolicyDashboard";
import PolicyXMatrix from "./pages/policy/PolicyXMatrix";
import PolicyBowling from "./pages/policy/PolicyBowling";
import PolicyActions from "./pages/policy/PolicyActions";
import PolicyCatchball from "./pages/policy/PolicyCatchball";
import PolicyDeployments from "./pages/policy/PolicyDeployments";
import PolicyManagePage from "./pages/policy/PolicyManagePage";
import PolicyIntegrations from "./pages/policy/PolicyIntegrations";

function Router() {
  return (
    <PolicyDeploymentLayout>
      <PolicyProvider>
        <Switch>
          <Route path="/" component={PolicyDashboard} />
          <Route path="/xmatrix" component={PolicyXMatrix} />
          <Route path="/bowling" component={PolicyBowling} />
          <Route path="/actions" component={PolicyActions} />
          <Route path="/catchball" component={PolicyCatchball} />
          <Route path="/deployments" component={PolicyDeployments} />
          <Route path="/manage" component={PolicyManagePage} />
          <Route path="/integrations" component={PolicyIntegrations} />
          <Route component={NotFound} />
        </Switch>
      </PolicyProvider>
    </PolicyDeploymentLayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
