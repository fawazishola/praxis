import * as xrpl from "xrpl";

// ── XRPL WebSocket Connection Pool ──────────────────────────────────────────
// Manages a pool of XRPL WebSocket clients for serverless (Next.js) environments.
// Prevents hanging promises by enforcing idle timeouts and maximum connection lifetimes.
// Reuses existing healthy connections to avoid repeated handshake overhead.

interface PooledConnection {
    client: xrpl.Client;
    endpoint: string;
    createdAt: number;
    lastUsedAt: number;
    inUse: boolean;
}

interface PoolOptions {
    /** XRPL WebSocket endpoints to try (in priority order) */
    endpoints: string[];
    /** Maximum number of concurrent connections in the pool */
    maxConnections: number;
    /** Connection timeout in ms (default: 15000) */
    connectTimeoutMs: number;
    /** How long an idle connection can stay in the pool before being reaped (ms) (default: 30000) */
    idleTimeoutMs: number;
    /** Maximum lifetime of any single connection (ms) (default: 120000) */
    maxLifetimeMs: number;
}

const DEFAULT_OPTIONS: PoolOptions = {
    endpoints: [
        "wss://s.altnet.rippletest.net:51233",
        "wss://testnet.xrpl-labs.com",
        "wss://xrplcluster.com",
    ],
    maxConnections: 3,
    connectTimeoutMs: 15_000,
    idleTimeoutMs: 30_000,
    maxLifetimeMs: 120_000,
};

class XrplConnectionPool {
    private pool: PooledConnection[] = [];
    private opts: PoolOptions;
    private reapTimer: ReturnType<typeof setInterval> | null = null;

    constructor(options?: Partial<PoolOptions>) {
        this.opts = { ...DEFAULT_OPTIONS, ...options };
        // Start periodic idle reaper
        this.reapTimer = setInterval(() => this.reapIdle(), this.opts.idleTimeoutMs);
        // Ensure the timer doesn't prevent Node.js from exiting
        if (this.reapTimer && typeof this.reapTimer === "object" && "unref" in this.reapTimer) {
            this.reapTimer.unref();
        }
    }

    /**
     * Acquire a connected XRPL client from the pool.
     * Reuses an existing idle connection if one is healthy, otherwise creates a new one.
     */
    async acquire(): Promise<xrpl.Client> {
        // Try to reuse an idle connection
        const idle = this.pool.find(
            (c) => !c.inUse && c.client.isConnected() && !this.isExpired(c),
        );
        if (idle) {
            idle.inUse = true;
            idle.lastUsedAt = Date.now();
            return idle.client;
        }

        // Prune dead or expired connections
        await this.pruneStale();

        // Create a new connection if under limit
        if (this.pool.length < this.opts.maxConnections) {
            const conn = await this.createConnection();
            conn.inUse = true;
            this.pool.push(conn);
            return conn.client;
        }

        // Pool is full — wait briefly for one to free up, then force-create
        await new Promise((r) => setTimeout(r, 500));
        const freed = this.pool.find((c) => !c.inUse && c.client.isConnected());
        if (freed) {
            freed.inUse = true;
            freed.lastUsedAt = Date.now();
            return freed.client;
        }

        // As a last resort, evict the oldest connection
        const oldest = this.pool
            .filter((c) => !c.inUse)
            .sort((a, b) => a.lastUsedAt - b.lastUsedAt)[0];
        if (oldest) {
            await this.removeConnection(oldest);
        }

        const conn = await this.createConnection();
        conn.inUse = true;
        this.pool.push(conn);
        return conn.client;
    }

    /**
     * Release a client back to the pool after use.
     */
    release(client: xrpl.Client): void {
        const entry = this.pool.find((c) => c.client === client);
        if (entry) {
            entry.inUse = false;
            entry.lastUsedAt = Date.now();
        }
    }

    /**
     * Disconnect and destroy all connections in the pool.
     */
    async destroy(): Promise<void> {
        if (this.reapTimer) {
            clearInterval(this.reapTimer);
            this.reapTimer = null;
        }
        await Promise.all(
            this.pool.map(async (c) => {
                try {
                    if (c.client.isConnected()) await c.client.disconnect();
                } catch { /* swallow */ }
            }),
        );
        this.pool = [];
    }

    /** Current pool size */
    get size(): number {
        return this.pool.length;
    }

    /** Number of active (in-use) connections */
    get activeCount(): number {
        return this.pool.filter((c) => c.inUse).length;
    }

    // ── Private helpers ──────────────────────────────────────────────────────

    private async createConnection(): Promise<PooledConnection> {
        const endpoints = this.opts.endpoints;
        let lastError: Error | null = null;

        for (const endpoint of endpoints) {
            try {
                const client = new xrpl.Client(endpoint);
                await this.connectWithTimeout(client, this.opts.connectTimeoutMs);
                return {
                    client,
                    endpoint,
                    createdAt: Date.now(),
                    lastUsedAt: Date.now(),
                    inUse: false,
                };
            } catch (err: unknown) {
                lastError = err instanceof Error ? err : new Error(String(err));
            }
        }

        throw new Error(
            `Failed to connect to any XRPL endpoint. Last error: ${lastError?.message}`,
        );
    }

    private connectWithTimeout(client: xrpl.Client, timeoutMs: number): Promise<void> {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error(`Connection timed out after ${timeoutMs}ms`));
            }, timeoutMs);
            client
                .connect()
                .then(() => {
                    clearTimeout(timer);
                    resolve();
                })
                .catch((err) => {
                    clearTimeout(timer);
                    reject(err);
                });
        });
    }

    private isExpired(conn: PooledConnection): boolean {
        return Date.now() - conn.createdAt > this.opts.maxLifetimeMs;
    }

    private async removeConnection(conn: PooledConnection): Promise<void> {
        const idx = this.pool.indexOf(conn);
        if (idx !== -1) this.pool.splice(idx, 1);
        try {
            if (conn.client.isConnected()) await conn.client.disconnect();
        } catch { /* swallow */ }
    }

    private async pruneStale(): Promise<void> {
        const stale = this.pool.filter(
            (c) => !c.inUse && (!c.client.isConnected() || this.isExpired(c)),
        );
        await Promise.all(stale.map((c) => this.removeConnection(c)));
    }

    private async reapIdle(): Promise<void> {
        const now = Date.now();
        const idle = this.pool.filter(
            (c) => !c.inUse && now - c.lastUsedAt > this.opts.idleTimeoutMs,
        );
        await Promise.all(idle.map((c) => this.removeConnection(c)));
    }
}

// ── Singleton pool for the process (shared across serverless invocations) ───
let globalPool: XrplConnectionPool | null = null;

/**
 * Returns the shared XRPL connection pool singleton.
 * In Next.js serverless, this survives across warm function invocations.
 */
export function getConnectionPool(options?: Partial<PoolOptions>): XrplConnectionPool {
    if (!globalPool) {
        const envRpc = process.env.NEXT_PUBLIC_XRPL_RPC;
        const endpoints = envRpc
            ? [envRpc, ...DEFAULT_OPTIONS.endpoints.filter((e) => e !== envRpc)]
            : DEFAULT_OPTIONS.endpoints;
        globalPool = new XrplConnectionPool({ ...options, endpoints });
    }
    return globalPool;
}

export { XrplConnectionPool };
export type { PoolOptions };
