import { NodeSSH } from 'node-ssh';

export interface ServerMetricsData {
  cpuUsage: number;
  ramUsage: number;
  ramUsagePercent: number;
  diskUsage: number;
  diskUsagePercent: number;
  networkIn: number;
  networkOut: number;
  activeConnections: number;
  uptime: string;
  osVersion: string;
  kernelVersion: string;
  cpuModel: string;
  cpuCores: number;
  totalRam: number;
  totalDisk: number;
}

export interface ServerConnectionConfig {
  hostname: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: string;
}

export class ServerConnection {
  private ssh: NodeSSH;
  private config: ServerConnectionConfig;
  private connected: boolean = false;

  constructor(config: ServerConnectionConfig) {
    this.ssh = new NodeSSH();
    this.config = config;
  }

  async connect(): Promise<boolean> {
    try {
      const connectConfig: any = {
        host: this.config.hostname,
        port: this.config.port,
        username: this.config.username,
      };

      if (this.config.privateKey) {
        connectConfig.privateKey = this.config.privateKey;
      } else if (this.config.password) {
        connectConfig.password = this.config.password;
      }

      await this.ssh.connect(connectConfig);
      this.connected = true;
      return true;
    } catch (error) {
      console.error('Failed to connect to server:', error);
      this.connected = false;
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.connected) {
      await this.ssh.dispose();
      this.connected = false;
    }
  }

  async getMetrics(): Promise<ServerMetricsData> {
    if (!this.connected) {
      throw new Error('Not connected to server');
    }

    try {
      // Get CPU usage
      const cpuResult = await this.ssh.execCommand(
        "grep 'cpu ' /proc/stat | awk '{usage=($2+$4)*100/($2+$4+$5)} END {print usage}'"
      );
      const cpuUsage = parseFloat(cpuResult.stdout) || 0;

      // Get RAM usage
      const ramResult = await this.ssh.execCommand(
        "free | grep Mem | awk '{print ($3/$2) * 100}'"
      );
      const ramUsagePercent = parseFloat(ramResult.stdout) || 0;

      // Get total RAM
      const totalRamResult = await this.ssh.execCommand(
        "free -b | grep Mem | awk '{print $2}'"
      );
      const totalRam = parseInt(totalRamResult.stdout) || 0;
      const ramUsage = Math.round((ramUsagePercent / 100) * totalRam);

      // Get disk usage
      const diskResult = await this.ssh.execCommand(
        "df -B1 / | awk 'NR==2 {print ($3/$2)*100}'"
      );
      const diskUsagePercent = parseFloat(diskResult.stdout) || 0;

      // Get total disk
      const totalDiskResult = await this.ssh.execCommand(
        "df -B1 / | awk 'NR==2 {print $2}'"
      );
      const totalDisk = parseInt(totalDiskResult.stdout) || 0;
      const diskUsage = Math.round((diskUsagePercent / 100) * totalDisk);

      // Get network stats
      const netResult = await this.ssh.execCommand(
        "cat /proc/net/dev | tail -n +3 | awk '{rx+=$2; tx+=$10} END {print rx \" \" tx}'"
      );
      const [networkIn, networkOut] = netResult.stdout.split(' ').map(Number);

      // Get active connections
      const connResult = await this.ssh.execCommand(
        "netstat -an | grep ESTABLISHED | wc -l"
      );
      const activeConnections = parseInt(connResult.stdout) || 0;

      // Get uptime
      const uptimeResult = await this.ssh.execCommand('uptime -p');
      const uptime = uptimeResult.stdout.trim();

      // Get OS version
      const osResult = await this.ssh.execCommand(
        "cat /etc/os-release | grep PRETTY_NAME | cut -d'\"' -f2"
      );
      const osVersion = osResult.stdout.trim();

      // Get kernel version
      const kernelResult = await this.ssh.execCommand('uname -r');
      const kernelVersion = kernelResult.stdout.trim();

      // Get CPU model
      const cpuModelResult = await this.ssh.execCommand(
        "lscpu | grep 'Model name' | cut -d':' -f2 | xargs"
      );
      const cpuModel = cpuModelResult.stdout.trim();

      // Get CPU cores
      const cpuCoresResult = await this.ssh.execCommand(
        "nproc"
      );
      const cpuCores = parseInt(cpuCoresResult.stdout) || 1;

      return {
        cpuUsage: Math.min(cpuUsage, 100),
        ramUsage,
        ramUsagePercent: Math.min(ramUsagePercent, 100),
        diskUsage,
        diskUsagePercent: Math.min(diskUsagePercent, 100),
        networkIn: networkIn || 0,
        networkOut: networkOut || 0,
        activeConnections,
        uptime,
        osVersion,
        kernelVersion,
        cpuModel,
        cpuCores,
        totalRam,
        totalDisk,
      };
    } catch (error) {
      console.error('Failed to get metrics:', error);
      throw error;
    }
  }

  async getProcesses(): Promise<any[]> {
    if (!this.connected) {
      throw new Error('Not connected to server');
    }

    try {
      const result = await this.ssh.execCommand(
        "ps aux --sort=-%cpu | head -20 | tail -n +2 | awk '{print $2, $1, $3, $4, $11}'"
      );

      return result.stdout
        .split('\n')
        .filter(line => line.trim())
        .map((line, index) => {
          const parts = line.trim().split(/\s+/);
          return {
            id: index,
            pid: parseInt(parts[0]) || 0,
            user: parts[1] || 'unknown',
            cpuUsage: parseFloat(parts[2]) || 0,
            ramUsage: parseFloat(parts[3]) || 0,
            name: parts[4] || 'unknown',
            status: 'running',
            command: parts.slice(4).join(' '),
          };
        });
    } catch (error) {
      console.error('Failed to get processes:', error);
      return [];
    }
  }

  async getLogs(lines: number = 100): Promise<any[]> {
    if (!this.connected) {
      throw new Error('Not connected to server');
    }

    try {
      const result = await this.ssh.execCommand(
        `journalctl -n ${lines} --no-pager -o json`
      );

      const logs = result.stdout
        .split('\n')
        .filter(line => line.trim())
        .map((line, index) => {
          try {
            const parsed = JSON.parse(line);
            return {
              id: index,
              serverId: 0,
              level: parsed.PRIORITY === '0' ? 'critical' : 
                     parsed.PRIORITY === '1' ? 'error' : 
                     parsed.PRIORITY === '2' ? 'warning' : 'info',
              message: parsed.MESSAGE || '',
              source: parsed.SYSLOG_IDENTIFIER || 'system',
              timestamp: new Date(parseInt(parsed.__REALTIME_TIMESTAMP) / 1000),
              details: JSON.stringify(parsed),
            };
          } catch {
            return null;
          }
        })
        .filter(Boolean);

      return logs;
    } catch (error) {
      console.error('Failed to get logs:', error);
      return [];
    }
  }

  isConnected(): boolean {
    return this.connected;
  }
}

// Connection pool for managing multiple server connections
export class ServerConnectionPool {
  private connections: Map<number, ServerConnection> = new Map();

  addConnection(serverId: number, connection: ServerConnection): void {
    this.connections.set(serverId, connection);
  }

  getConnection(serverId: number): ServerConnection | undefined {
    return this.connections.get(serverId);
  }

  removeConnection(serverId: number): void {
    const conn = this.connections.get(serverId);
    if (conn) {
      conn.disconnect();
      this.connections.delete(serverId);
    }
  }

  async disconnectAll(): Promise<void> {
    const conns = Array.from(this.connections.values());
    for (const conn of conns) {
      await conn.disconnect();
    }
    this.connections.clear();
  }
}

export const connectionPool = new ServerConnectionPool();
