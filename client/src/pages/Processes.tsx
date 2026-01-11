import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Cpu, Database, Play, RefreshCw, Search, Square, RotateCw } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "wouter";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function Processes() {
  const { serverId: serverIdParam } = useParams<{ serverId: string }>();
  const serverId = parseInt(serverIdParam || '0');
  const { user, loading: authLoading } = useAuth();
  
  const { data: server } = trpc.servers.getById.useQuery({ id: serverId });
  const { data: processes, isLoading, refetch } = trpc.processes.list.useQuery({ serverId });
  const processAction = trpc.processes.action.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      refetch();
    },
    onError: (error) => {
      toast.error(`Action failed: ${error.message}`);
    },
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'cpu' | 'ram' | 'name'>('cpu');

  if (authLoading || isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  const filteredProcesses = processes?.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.user?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.command?.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => {
    if (sortBy === 'cpu') return b.cpuUsage - a.cpuUsage;
    if (sortBy === 'ram') return Number(b.ramUsage) - Number(a.ramUsage);
    return a.name.localeCompare(b.name);
  }) || [];

  const formatBytes = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    if (mb < 1024) return `${mb.toFixed(1)} MB`;
    const gb = mb / 1024;
    return `${gb.toFixed(2)} GB`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'running':
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Running</Badge>;
      case 'sleeping':
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">Sleeping</Badge>;
      case 'stopped':
        return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Stopped</Badge>;
      case 'zombie':
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Zombie</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleAction = (pid: number, action: 'start' | 'stop' | 'restart') => {
    processAction.mutate({ serverId, pid, action });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/server/${serverId}`}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">Processes</h1>
              <p className="text-muted-foreground">{server?.name}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Filters */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Process Management</CardTitle>
            <CardDescription>Monitor and control running processes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search processes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={sortBy === 'cpu' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSortBy('cpu')}
                >
                  <Cpu className="h-4 w-4 mr-2" />
                  Sort by CPU
                </Button>
                <Button
                  variant={sortBy === 'ram' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSortBy('ram')}
                >
                  <Database className="h-4 w-4 mr-2" />
                  Sort by RAM
                </Button>
                <Button
                  variant={sortBy === 'name' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSortBy('name')}
                >
                  Sort by Name
                </Button>
              </div>
            </div>

            <div className="rounded-md border border-border/50">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">CPU %</TableHead>
                    <TableHead className="text-right">RAM</TableHead>
                    <TableHead>Command</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProcesses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        No processes found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProcesses.map((process) => (
                      <TableRow key={process.id}>
                        <TableCell className="font-mono">{process.pid}</TableCell>
                        <TableCell className="font-medium">{process.name}</TableCell>
                        <TableCell className="text-muted-foreground">{process.user || 'N/A'}</TableCell>
                        <TableCell>{getStatusBadge(process.status)}</TableCell>
                        <TableCell className="text-right font-mono">
                          {process.cpuUsage.toFixed(1)}%
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatBytes(Number(process.ramUsage))}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm max-w-xs truncate">
                          {process.command || 'N/A'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleAction(process.pid, 'start')}
                              disabled={processAction.isPending}
                            >
                              <Play className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleAction(process.pid, 'stop')}
                              disabled={processAction.isPending}
                            >
                              <Square className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleAction(process.pid, 'restart')}
                              disabled={processAction.isPending}
                            >
                              <RotateCw className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="mt-4 text-sm text-muted-foreground">
              Showing {filteredProcesses.length} of {processes?.length || 0} processes
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
