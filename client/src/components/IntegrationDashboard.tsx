/**
 * IntegrationDashboard — Subdomain Integration Management & Push Log Monitor
 * Temporarily disabled: backend integration procedures moved to Portal API.
 * Will be restored when Portal exposes integration/push-log endpoints.
 */
import { Construction } from 'lucide-react';

export default function IntegrationDashboard() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-muted-foreground">
      <Construction className="h-12 w-12" />
      <h2 className="text-lg font-semibold text-foreground">Integrations</h2>
      <p className="text-sm max-w-md text-center">
        Integration management and push logs have moved to the Portal. This page
        will be available once the Portal exposes integration endpoints.
      </p>
    </div>
  );
}
