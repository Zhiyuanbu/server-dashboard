import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import AddServerDialog from "@/components/AddServerDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Activity, AlertTriangle, CheckCircle2, Clock, Cpu, Database, HardDrive, Network, Plus, Server as ServerIcon, XCircle } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

export default function Dashboard() {
  const [showAddServer, setShowAddServer] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const { data: servers, isLoading, refetch } = trpc.servers.list.useQuery();
  const initializeDemoServers = trpc.servers.initializeDemoServers.useMutation({
    onSuccess: () => {
      toast.success("Demo servers initialized successfully!");
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to initialize demo servers: ${error.message}`);
    },
  });

  if (authLoading || isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  const onlineServers = servers?.filter(s => s.status === 'online').length || 0;
  const warningServers = servers?.filter(s => s.status === 'warning').length || 0;
  const offlineServers = servers?.filter(s => s.status === 'offline' || s.status === 'error').length || 0;
  const totalServers = servers?.length || 0;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'offline':
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'online':
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Online</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Warning</Badge>;
      case 'offline':
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Offline</Badge>;
      case 'error':
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Error</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const formatUptime = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    return `${days}d ${hours}h`;
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes) return 'N/A';
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(1)} GB`;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Stats Overview */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Servers</CardTitle>
              <ServerIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalServers}</div>
              <p className="text-xs text-muted-foreground mt-1">Across all environments</p>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Online</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{onlineServers}</div>
              <p className="text-xs text-muted-foreground mt-1">Operating normally</p>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Warnings</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-500">{warningServers}</div>
              <p className="text-xs text-muted-foreground mt-1">Require attention</p>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Offline</CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">{offlineServers}</div>
              <p className="text-xs text-muted-foreground mt-1">Not responding</p>
            </CardContent>
          </Card>
        </div>

        {/* Server List */}
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Servers</CardTitle>
              <CardDescription>Manage and monitor your server infrastructure</CardDescription>
            </div>
            <div className="flex gap-2">
              {totalServers === 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => initializeDemoServers.mutate()}
                  disabled={initializeDemoServers.isPending}
                >
                  {initializeDemoServers.isPending ? "Initializing..." : "Add Demo Servers"}
                </Button>
              )}
              <Button size="sm" onClick={() => setShowAddServer(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Server
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {totalServers === 0 ? (
              <div className="text-center py-12">
                <ServerIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No servers configured</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Get started by adding your first server or initialize demo servers to explore the dashboard.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {servers?.map((server) => (
                  <Link key={server.id} href={`/server/${server.id}`}>
                    <div className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-card/30 hover:bg-card/50 hover:border-border transition-all cursor-pointer group">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(server.status)}
                          <div>
                            <h4 className="font-semibold group-hover:text-primary transition-colors">{server.name}</h4>
                            <p className="text-sm text-muted-foreground">{server.hostname} • {server.ipAddress}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <Cpu className="h-4 w-4 text-muted-foreground" />
                            <span>{server.cpuCores || 'N/A'} cores</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Database className="h-4 w-4 text-muted-foreground" />
                            <span>{formatBytes(server.totalRam ?? undefined)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <HardDrive className="h-4 w-4 text-muted-foreground" />
                            <span>{formatBytes(server.totalDisk ?? undefined)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span>{formatUptime(server.uptime ?? undefined)}</span>
                          </div>
                        </div>
                        {getStatusBadge(server.status)}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AddServerDialog
        open={showAddServer}
        onOpenChange={setShowAddServer}
        onServerAdded={() => refetch()}
      />
    </DashboardLayout>
  );
}
