import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { Loader2, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

interface AddServerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onServerAdded?: () => void;
}

export default function AddServerDialog({
  open,
  onOpenChange,
  onServerAdded,
}: AddServerDialogProps) {
  const [tab, setTab] = useState<"basic" | "ssh">("basic");
  const [formData, setFormData] = useState({
    name: "",
    hostname: "",
    ipAddress: "",
    port: 22,
    os: "",
    osVersion: "",
    username: "",
    password: "",
    privateKey: "",
  });

  const createServer = trpc.servers.create.useMutation({
    onSuccess: () => {
      toast.success("Server added successfully!");
      setFormData({
        name: "",
        hostname: "",
        ipAddress: "",
        port: 22,
        os: "",
        osVersion: "",
        username: "",
        password: "",
        privateKey: "",
      });
      onOpenChange(false);
      onServerAdded?.();
    },
    onError: (error: any) => {
      toast.error(`Failed to add server: ${error.message}`);
    },
  });

  const testConnection = trpc.servers.testConnection.useMutation({
    onSuccess: (data: any) => {
      if (data.success) {
        toast.success("Connection successful!");
      } else {
        toast.error(`Connection failed: ${data.error}`);
      }
    },
    onError: (error: any) => {
      toast.error(`Test failed: ${error.message}`);
    },
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "port" ? parseInt(value) || 22 : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.hostname || !formData.ipAddress) {
      toast.error("Please fill in all required fields");
      return;
    }

    createServer.mutate({
      name: formData.name,
      hostname: formData.hostname,
      ipAddress: formData.ipAddress,
      port: formData.port,
      os: formData.os || "Linux",
      osVersion: formData.osVersion || "Unknown",
    });
  };

  const handleTestConnection = () => {
    if (!formData.hostname || !formData.username) {
      toast.error("Please fill in hostname and username");
      return;
    }

    testConnection.mutate({
      hostname: formData.hostname,
      port: formData.port,
      username: formData.username,
      password: formData.password || undefined,
      privateKey: formData.privateKey || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add New Server
          </DialogTitle>
          <DialogDescription>
            Add a new server to monitor. You can configure SSH credentials for real-time monitoring.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "basic" | "ssh")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="ssh">SSH Connection</TabsTrigger>
          </TabsList>

          <form onSubmit={handleSubmit} className="space-y-6">
            <TabsContent value="basic" className="space-y-4">
              <div>
                <Label htmlFor="name">Server Name *</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="e.g., Production Web Server"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="hostname">Hostname *</Label>
                  <Input
                    id="hostname"
                    name="hostname"
                    placeholder="e.g., web-prod-01"
                    value={formData.hostname}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="ipAddress">IP Address *</Label>
                  <Input
                    id="ipAddress"
                    name="ipAddress"
                    placeholder="e.g., 192.168.1.100"
                    value={formData.ipAddress}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="os">Operating System</Label>
                  <Input
                    id="os"
                    name="os"
                    placeholder="e.g., Ubuntu"
                    value={formData.os}
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <Label htmlFor="osVersion">OS Version</Label>
                  <Input
                    id="osVersion"
                    name="osVersion"
                    placeholder="e.g., 22.04 LTS"
                    value={formData.osVersion}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="port">SSH Port</Label>
                <Input
                  id="port"
                  name="port"
                  type="number"
                  value={formData.port}
                  onChange={handleInputChange}
                />
              </div>
            </TabsContent>

            <TabsContent value="ssh" className="space-y-4">
              <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4 text-sm">
                <p className="text-blue-700 dark:text-blue-300">
                  💡 Configure SSH credentials to enable real-time monitoring of system metrics,
                  processes, and logs directly from your servers.
                </p>
              </div>

              <div>
                <Label htmlFor="username">SSH Username</Label>
                <Input
                  id="username"
                  name="username"
                  placeholder="e.g., ubuntu"
                  value={formData.username}
                  onChange={handleInputChange}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="SSH password (optional)"
                    value={formData.password}
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleTestConnection}
                    disabled={testConnection.isPending}
                  >
                    {testConnection.isPending && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    Test Connection
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="privateKey">Private Key (PEM)</Label>
                <Textarea
                  id="privateKey"
                  name="privateKey"
                  placeholder="Paste your private key here (optional)"
                  value={formData.privateKey}
                  onChange={handleInputChange}
                  rows={6}
                  className="font-mono text-xs"
                />
              </div>
            </TabsContent>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createServer.isPending}>
                {createServer.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Add Server
              </Button>
            </div>
          </form>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
