import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings as SettingsIcon, Bell, Mail, Shield, Key, Copy, Trash2, Plus, Eye, EyeOff, Code } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

export default function Settings() {
  const { user, loading: authLoading } = useAuth();
  const [showNewKeyDialog, setShowNewKeyDialog] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyDescription, setNewKeyDescription] = useState("");
  const [showRevoke, setShowRevoke] = useState<number | null>(null);
  const [visibleKeys, setVisibleKeys] = useState<Set<number>>(new Set());

  // API key queries and mutations
  const { data: apiKeys, isLoading: keysLoading, refetch: refetchKeys } = trpc.webhook.listApiKeys.useQuery();
  const createKeyMutation = trpc.webhook.createApiKey.useMutation({
    onSuccess: (newKey) => {
      toast.success("API key created successfully!");
      setNewKeyName("");
      setNewKeyDescription("");
      setShowNewKeyDialog(false);
      refetchKeys();
      
      // Show the new key once
      toast.success(`New key: ${newKey.key}`, {
        description: "Copy it now - you won't see it again!",
        duration: 10000,
      });
    },
    onError: (error) => {
      toast.error("Failed to create API key");
    },
  });

  const revokeKeyMutation = trpc.webhook.revokeApiKey.useMutation({
    onSuccess: () => {
      toast.success("API key revoked successfully");
      setShowRevoke(null);
      refetchKeys();
    },
    onError: () => {
      toast.error("Failed to revoke API key");
    },
  });

  const handleCreateKey = () => {
    if (!newKeyName.trim()) {
      toast.error("Please enter a key name");
      return;
    }
    createKeyMutation.mutate({
      name: newKeyName,
      description: newKeyDescription || undefined,
    });
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success("API key copied to clipboard");
  };

  const toggleKeyVisibility = (keyId: number) => {
    const newVisible = new Set(visibleKeys);
    if (newVisible.has(keyId)) {
      newVisible.delete(keyId);
    } else {
      newVisible.add(keyId);
    }
    setVisibleKeys(newVisible);
  };

  const maskKey = (key: string) => {
    return key.substring(0, 7) + "•".repeat(Math.max(0, key.length - 14)) + key.substring(Math.max(0, key.length - 7));
  };

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Configure your dashboard preferences and integrations</p>
        </div>

        <Tabs defaultValue="api-keys" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="api-keys" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              <span className="hidden sm:inline">API Keys</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Notifications</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Security</span>
            </TabsTrigger>
            <TabsTrigger value="account" className="flex items-center gap-2">
              <SettingsIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Account</span>
            </TabsTrigger>
          </TabsList>

          {/* API Keys Tab */}
          <TabsContent value="api-keys" className="space-y-6">
            <Card className="border-border/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Key className="h-5 w-5" />
                      API Keys
                    </CardTitle>
                    <CardDescription>
                      Manage API keys for webhook integrations and external system access
                    </CardDescription>
                  </div>
                  <Dialog open={showNewKeyDialog} onOpenChange={setShowNewKeyDialog}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Generate New Key
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Generate New API Key</DialogTitle>
                        <DialogDescription>
                          Create a new API key for webhook authentication. Store it securely.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="key-name">Key Name</Label>
                          <Input
                            id="key-name"
                            placeholder="e.g., Production Integration"
                            value={newKeyName}
                            onChange={(e) => setNewKeyName(e.target.value)}
                          />
                        </div>
                        <div>
                          <Label htmlFor="key-description">Description (Optional)</Label>
                          <Input
                            id="key-description"
                            placeholder="e.g., Used for CI/CD pipeline"
                            value={newKeyDescription}
                            onChange={(e) => setNewKeyDescription(e.target.value)}
                          />
                        </div>
                        <Button
                          onClick={handleCreateKey}
                          disabled={createKeyMutation.isPending}
                          className="w-full"
                        >
                          {createKeyMutation.isPending ? "Creating..." : "Create Key"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {keysLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : apiKeys && apiKeys.length > 0 ? (
                  <div className="space-y-4">
                    {apiKeys.map((apiKey) => (
                      <div key={apiKey.id} className="flex items-center justify-between p-4 border border-border/50 rounded-lg hover:bg-accent/50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold truncate">{apiKey.name}</h3>
                            {!apiKey.active && (
                              <Badge variant="secondary" className="text-xs">Revoked</Badge>
                            )}
                          </div>
                          {apiKey.description && (
                            <p className="text-sm text-muted-foreground truncate">{apiKey.description}</p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span>Created {formatDistanceToNow(new Date(apiKey.createdAt), { addSuffix: true })}</span>
                            {apiKey.lastUsed && (
                              <span>Last used {formatDistanceToNow(new Date(apiKey.lastUsed), { addSuffix: true })}</span>
                            )}
                          </div>
                        </div>

                        {apiKey.active && (
                          <div className="flex items-center gap-2 ml-4">
                            <div className="flex items-center gap-1 px-3 py-2 bg-muted rounded font-mono text-sm">
                              {visibleKeys.has(apiKey.id) ? (
                                <>
                                  <span className="select-all">{apiKey.key}</span>
                                  <button
                                    onClick={() => toggleKeyVisibility(apiKey.id)}
                                    className="text-muted-foreground hover:text-foreground"
                                  >
                                    <EyeOff className="h-4 w-4" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <span>{maskKey(apiKey.key)}</span>
                                  <button
                                    onClick={() => toggleKeyVisibility(apiKey.id)}
                                    className="text-muted-foreground hover:text-foreground"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </button>
                                </>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCopyKey(apiKey.key)}
                              title="Copy to clipboard"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        )}

                        {apiKey.active && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowRevoke(apiKey.id)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Key className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <p className="text-muted-foreground mb-4">No API keys yet</p>
                    <Dialog open={showNewKeyDialog} onOpenChange={setShowNewKeyDialog}>
                      <DialogTrigger asChild>
                        <Button variant="outline">
                          <Plus className="h-4 w-4 mr-2" />
                          Create Your First Key
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Generate New API Key</DialogTitle>
                          <DialogDescription>
                            Create a new API key for webhook authentication. Store it securely.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="key-name">Key Name</Label>
                            <Input
                              id="key-name"
                              placeholder="e.g., Production Integration"
                              value={newKeyName}
                              onChange={(e) => setNewKeyName(e.target.value)}
                            />
                          </div>
                          <div>
                            <Label htmlFor="key-description">Description (Optional)</Label>
                            <Input
                              id="key-description"
                              placeholder="e.g., Used for CI/CD pipeline"
                              value={newKeyDescription}
                              onChange={(e) => setNewKeyDescription(e.target.value)}
                            />
                          </div>
                          <Button
                            onClick={handleCreateKey}
                            disabled={createKeyMutation.isPending}
                            className="w-full"
                          >
                            {createKeyMutation.isPending ? "Creating..." : "Create Key"}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Webhook Documentation */}
            <Card className="border-border/50 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="h-5 w-5" />
                  Webhook API Documentation
                </CardTitle>
                <CardDescription>
                  Use your API key to integrate external systems with server management
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Endpoint</h4>
                  <code className="block bg-background p-3 rounded text-sm overflow-x-auto">
                    POST /api/trpc/webhook.handleEvent
                  </code>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Authentication</h4>
                  <p className="text-sm text-muted-foreground mb-2">Include your API key in the request payload:</p>
                  <code className="block bg-background p-3 rounded text-sm overflow-x-auto">
                    {`{
  "action": "create_server",
  "apiKey": "sk_your_api_key_here",
  "data": { ... }
}`}
                  </code>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Available Actions</h4>
                  <ul className="text-sm space-y-2 text-muted-foreground">
                    <li>• <code className="bg-muted px-2 py-1 rounded">create_server</code> - Create a new server</li>
                    <li>• <code className="bg-muted px-2 py-1 rounded">start_server</code> - Start a server</li>
                    <li>• <code className="bg-muted px-2 py-1 rounded">stop_server</code> - Stop a server</li>
                    <li>• <code className="bg-muted px-2 py-1 rounded">restart_server</code> - Restart a server</li>
                    <li>• <code className="bg-muted px-2 py-1 rounded">delete_server</code> - Delete a server</li>
                    <li>• <code className="bg-muted px-2 py-1 rounded">update_metrics</code> - Update server metrics</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Example: Create Server</h4>
                  <code className="block bg-background p-3 rounded text-sm overflow-x-auto">
                    {`curl -X POST https://your-domain.com/api/trpc/webhook.handleEvent \\
  -H "Content-Type: application/json" \\
  -d '{
    "action": "create_server",
    "apiKey": "sk_your_key",
    "data": {
      "name": "Web Server 1",
      "hostname": "web1.example.com",
      "ipAddress": "192.168.1.100",
      "os": "Ubuntu",
      "osVersion": "22.04"
    }
  }'`}
                  </code>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notifications
                </CardTitle>
                <CardDescription>
                  Manage alert and notification preferences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Configure how and when you receive alerts about server events and threshold breaches.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Security
                </CardTitle>
                <CardDescription>
                  Security and authentication settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Manage authentication methods, API keys, and access controls.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Account Tab */}
          <TabsContent value="account" className="space-y-6">
            <Card className="border-border/50 bg-primary/5">
              <CardHeader>
                <CardTitle>Your Account</CardTitle>
                <CardDescription>Current user information</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name</span>
                    <span className="font-medium">{user?.name || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email</span>
                    <span className="font-medium">{user?.email || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Role</span>
                    <span className="font-medium capitalize">{user?.role || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Login Method</span>
                    <span className="font-medium">{user?.loginMethod || 'N/A'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Revoke Confirmation Dialog */}
        <AlertDialog open={showRevoke !== null} onOpenChange={(open) => !open && setShowRevoke(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Revoke API Key?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. Any integrations using this key will stop working immediately.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex gap-3 justify-end">
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (showRevoke !== null) {
                    revokeKeyMutation.mutate({ id: showRevoke });
                  }
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {revokeKeyMutation.isPending ? "Revoking..." : "Revoke"}
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
