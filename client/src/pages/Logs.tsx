import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { AlertCircle, AlertTriangle, ArrowLeft, Info, RefreshCw, Search, XCircle } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "wouter";
import { Badge } from "@/components/ui/badge";

export default function Logs() {
  const { serverId: serverIdParam } = useParams<{ serverId: string }>();
  const serverId = parseInt(serverIdParam || '0');
  const { user, loading: authLoading } = useAuth();
  
  const { data: server } = trpc.servers.getById.useQuery({ id: serverId });
  const [selectedLevel, setSelectedLevel] = useState<'info' | 'warning' | 'error' | 'critical' | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  
  const { data: logs, isLoading, refetch } = trpc.logs.list.useQuery({
    serverId,
    limit: 200,
    level: selectedLevel,
  });

  const filteredLogs = logs?.filter(log =>
    log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.source?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (authLoading || isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      case 'critical':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Info className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'info':
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">Info</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Warning</Badge>;
      case 'error':
        return <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/20">Error</Badge>;
      case 'critical':
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Critical</Badge>;
      default:
        return <Badge variant="outline">{level}</Badge>;
    }
  };

  const levelCounts = {
    info: logs?.filter(l => l.level === 'info').length || 0,
    warning: logs?.filter(l => l.level === 'warning').length || 0,
    error: logs?.filter(l => l.level === 'error').length || 0,
    critical: logs?.filter(l => l.level === 'critical').length || 0,
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
              <h1 className="text-3xl font-bold">System Logs</h1>
              <p className="text-muted-foreground">{server?.name}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Level Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card
            className={`border-border/50 cursor-pointer transition-all ${selectedLevel === 'info' ? 'ring-2 ring-blue-500' : 'hover:border-blue-500/50'}`}
            onClick={() => setSelectedLevel(selectedLevel === 'info' ? undefined : 'info')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Info</CardTitle>
              <Info className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-500">{levelCounts.info}</div>
            </CardContent>
          </Card>

          <Card
            className={`border-border/50 cursor-pointer transition-all ${selectedLevel === 'warning' ? 'ring-2 ring-yellow-500' : 'hover:border-yellow-500/50'}`}
            onClick={() => setSelectedLevel(selectedLevel === 'warning' ? undefined : 'warning')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Warnings</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-500">{levelCounts.warning}</div>
            </CardContent>
          </Card>

          <Card
            className={`border-border/50 cursor-pointer transition-all ${selectedLevel === 'error' ? 'ring-2 ring-orange-500' : 'hover:border-orange-500/50'}`}
            onClick={() => setSelectedLevel(selectedLevel === 'error' ? undefined : 'error')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Errors</CardTitle>
              <AlertCircle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-500">{levelCounts.error}</div>
            </CardContent>
          </Card>

          <Card
            className={`border-border/50 cursor-pointer transition-all ${selectedLevel === 'critical' ? 'ring-2 ring-red-500' : 'hover:border-red-500/50'}`}
            onClick={() => setSelectedLevel(selectedLevel === 'critical' ? undefined : 'critical')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Critical</CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">{levelCounts.critical}</div>
            </CardContent>
          </Card>
        </div>

        {/* Log Viewer */}
        <Card className="border-border/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Log Entries</CardTitle>
                <CardDescription>
                  {selectedLevel ? `Filtered by ${selectedLevel} level` : 'All log levels'}
                </CardDescription>
              </div>
              {selectedLevel && (
                <Button variant="outline" size="sm" onClick={() => setSelectedLevel(undefined)}>
                  Clear Filter
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {filteredLogs.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No logs found
                </div>
              ) : (
                filteredLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex gap-3 p-3 rounded-lg border border-border/50 bg-card/30 hover:bg-card/50 transition-colors"
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {getLevelIcon(log.level)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {getLevelBadge(log.level)}
                        {log.source && (
                          <Badge variant="outline" className="text-xs">{log.source}</Badge>
                        )}
                        <span className="text-xs text-muted-foreground ml-auto">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm">{log.message}</p>
                      {log.details && (
                        <details className="mt-2">
                          <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                            Show details
                          </summary>
                          <pre className="mt-2 text-xs bg-muted/50 p-2 rounded overflow-x-auto">
                            {log.details}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 text-sm text-muted-foreground">
              Showing {filteredLogs.length} of {logs?.length || 0} log entries
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
