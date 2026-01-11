import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, Bell, CheckCircle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function Alerts() {
  const { user, loading: authLoading } = useAuth();
  const { data: servers } = trpc.servers.list.useQuery();
  
  // Get alerts for all servers
  const serverAlerts = servers?.map(server => ({
    server,
    alerts: trpc.alerts.list.useQuery({ serverId: server.id, includeAcknowledged: false }),
  })) || [];

  const acknowledgeAlert = trpc.alerts.acknowledge.useMutation({
    onSuccess: () => {
      toast.success("Alert acknowledged");
      // Refetch all alerts
      serverAlerts.forEach(sa => sa.alerts.refetch());
    },
    onError: (error) => {
      toast.error(`Failed to acknowledge alert: ${error.message}`);
    },
  });

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  const allAlerts = serverAlerts.flatMap(sa => 
    (sa.alerts.data || []).map(alert => ({ ...alert, serverName: sa.server.name }))
  );

  const criticalAlerts = allAlerts.filter(a => a.severity === 'critical').length;
  const warningAlerts = allAlerts.filter(a => a.severity === 'warning').length;

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Critical</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Warning</Badge>;
      default:
        return <Badge variant="outline">{severity}</Badge>;
    }
  };

  const getMetricIcon = (metricType: string) => {
    switch (metricType) {
      case 'cpu':
        return '🔥';
      case 'ram':
        return '💾';
      case 'disk':
        return '💿';
      case 'network':
        return '🌐';
      default:
        return '📊';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Alerts</h1>
          <p className="text-muted-foreground">Monitor and manage system alerts</p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Active</CardTitle>
              <Bell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{allAlerts.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Unacknowledged alerts</p>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Critical</CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">{criticalAlerts}</div>
              <p className="text-xs text-muted-foreground mt-1">Require immediate attention</p>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Warnings</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-500">{warningAlerts}</div>
              <p className="text-xs text-muted-foreground mt-1">Monitor closely</p>
            </CardContent>
          </Card>
        </div>

        {/* Active Alerts */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Active Alerts</CardTitle>
            <CardDescription>Unacknowledged alerts across all servers</CardDescription>
          </CardHeader>
          <CardContent>
            {allAlerts.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">All Clear!</h3>
                <p className="text-sm text-muted-foreground">
                  No active alerts at the moment. All systems are operating normally.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {allAlerts
                  .sort((a, b) => {
                    // Sort by severity (critical first) then by date
                    if (a.severity === 'critical' && b.severity !== 'critical') return -1;
                    if (a.severity !== 'critical' && b.severity === 'critical') return 1;
                    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                  })
                  .map((alert) => (
                    <div
                      key={alert.id}
                      className={`flex items-start gap-4 p-4 rounded-lg border transition-all ${
                        alert.severity === 'critical'
                          ? 'border-red-500/50 bg-red-500/5'
                          : 'border-yellow-500/50 bg-yellow-500/5'
                      }`}
                    >
                      <div className="text-2xl flex-shrink-0">
                        {getMetricIcon(alert.metricType)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          {getSeverityBadge(alert.severity)}
                          <Badge variant="outline">{alert.serverName}</Badge>
                          <span className="text-xs text-muted-foreground ml-auto">
                            {new Date(alert.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm font-medium mb-1">{alert.message}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Metric: {alert.metricType.toUpperCase()}</span>
                          <span>Current: {alert.currentValue.toFixed(1)}%</span>
                          <span>Threshold: {alert.threshold.toFixed(1)}%</span>
                          {alert.emailSent && (
                            <Badge variant="outline" className="text-xs">
                              📧 Email Sent
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => acknowledgeAlert.mutate({ alertId: alert.id })}
                        disabled={acknowledgeAlert.isPending}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Acknowledge
                      </Button>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Alert Configuration Info */}
        <Card className="border-border/50 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Alert Configuration
            </CardTitle>
            <CardDescription>
              Alerts are automatically generated when server metrics exceed configured thresholds
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p>• <strong>CPU alerts:</strong> Triggered when CPU usage exceeds 90%</p>
              <p>• <strong>RAM alerts:</strong> Triggered when memory usage exceeds 85%</p>
              <p>• <strong>Disk alerts:</strong> Triggered when disk usage exceeds 90% or falls below 10% free</p>
              <p>• <strong>Network alerts:</strong> Triggered on unusual traffic patterns</p>
              <p className="text-muted-foreground mt-4">
                Email notifications are sent automatically for critical alerts when configured.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
