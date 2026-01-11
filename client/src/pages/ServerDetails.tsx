import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Activity, ArrowLeft, Cpu, Database, HardDrive, Network, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "wouter";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Badge } from "@/components/ui/badge";

export default function ServerDetails() {
  const { id } = useParams<{ id: string }>();
  const serverId = parseInt(id || '0');
  const { user, loading: authLoading } = useAuth();
  
  const { data: server, isLoading: serverLoading } = trpc.servers.getById.useQuery({ id: serverId });
  const { data: metrics, isLoading: metricsLoading, refetch: refetchMetrics } = trpc.metrics.latest.useQuery({ serverId, limit: 50 });
  const simulateUpdate = trpc.metrics.simulateUpdate.useMutation({
    onSuccess: () => {
      refetchMetrics();
    },
  });

  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      simulateUpdate.mutate({ serverId });
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, serverId]);

  if (authLoading || serverLoading || metricsLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!server) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h3 className="text-lg font-semibold mb-2">Server not found</h3>
          <Link href="/">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const latestMetric = metrics?.[0];
  const chartData = metrics?.slice().reverse().map((m, idx) => ({
    time: new Date(m.timestamp).toLocaleTimeString(),
    cpu: parseFloat(m.cpuUsage.toFixed(1)),
    ram: parseFloat(m.ramUsagePercent.toFixed(1)),
    disk: parseFloat(m.diskUsagePercent.toFixed(1)),
  })) || [];

  const formatBytes = (bytes: number) => {
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(2)} GB`;
  };

  const formatUptime = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">{server.name}</h1>
              <p className="text-muted-foreground">{server.hostname} • {server.ipAddress}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
              {autoRefresh ? 'Auto-refresh On' : 'Auto-refresh Off'}
            </Button>
            <Link href={`/processes/${serverId}`}>
              <Button variant="outline" size="sm">View Processes</Button>
            </Link>
            <Link href={`/logs/${serverId}`}>
              <Button variant="outline" size="sm">View Logs</Button>
            </Link>
          </div>
        </div>

        {/* Real-time Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
              <Cpu className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{latestMetric?.cpuUsage.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground mt-1">{server.cpuCores} cores • {server.cpuModel}</p>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">RAM Usage</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{latestMetric?.ramUsagePercent.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                {latestMetric && formatBytes(latestMetric.ramUsage)} / {server.totalRam && formatBytes(server.totalRam)}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Disk Usage</CardTitle>
              <HardDrive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{latestMetric?.diskUsagePercent.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                {latestMetric && formatBytes(latestMetric.diskUsage)} / {server.totalDisk && formatBytes(server.totalDisk)}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Network</CardTitle>
              <Network className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{latestMetric?.activeConnections || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Active connections</p>
            </CardContent>
          </Card>
        </div>

        {/* Performance Charts */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Performance Trends</CardTitle>
            <CardDescription>Real-time resource utilization over the last 50 data points</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.02 240)" />
                <XAxis dataKey="time" stroke="oklch(0.65 0.01 240)" />
                <YAxis stroke="oklch(0.65 0.01 240)" domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'oklch(0.16 0.015 240)',
                    border: '1px solid oklch(0.25 0.02 240)',
                    borderRadius: '0.5rem',
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="cpu" stroke="oklch(0.65 0.2 230)" name="CPU %" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="ram" stroke="oklch(0.55 0.18 200)" name="RAM %" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="disk" stroke="oklch(0.7 0.18 160)" name="Disk %" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* System Information */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>System Information</CardTitle>
            <CardDescription>Hardware and operating system details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Operating System</span>
                  <span className="font-medium">{server.os} {server.osVersion}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Kernel Version</span>
                  <span className="font-medium">{server.kernelVersion || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">CPU Model</span>
                  <span className="font-medium">{server.cpuModel || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">CPU Cores</span>
                  <span className="font-medium">{server.cpuCores || 'N/A'}</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total RAM</span>
                  <span className="font-medium">{server.totalRam ? formatBytes(server.totalRam) : 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Disk</span>
                  <span className="font-medium">{server.totalDisk ? formatBytes(server.totalDisk) : 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Uptime</span>
                  <span className="font-medium">{formatUptime(server.uptime ?? undefined)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Seen</span>
                  <span className="font-medium">
                    {server.lastSeen ? new Date(server.lastSeen).toLocaleString() : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
