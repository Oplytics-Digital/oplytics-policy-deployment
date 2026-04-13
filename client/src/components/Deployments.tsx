/*
 * Deployments Component — Policy Deployment Cascade
 * Temporarily disabled: backend deployment/audit procedures moved to Portal API.
 * Will be restored when Portal exposes deployment target and audit endpoints.
 */
import { Construction } from 'lucide-react';

export default function Deployments() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-muted-foreground">
      <Construction className="h-12 w-12" />
      <h2 className="text-lg font-semibold text-foreground">Deployments</h2>
      <p className="text-sm max-w-md text-center">
        Deployment targets and audits have moved to the Portal. This page will be
        available once the Portal exposes deployment endpoints.
      </p>
    </div>
  );
}
