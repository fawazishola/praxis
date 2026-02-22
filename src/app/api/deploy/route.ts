import { NextRequest, NextResponse } from "next/server";
import * as xrpl from "xrpl";

// ── Testnet RPC endpoints to try in order
const RPC_ENDPOINTS = [
    "wss://s.altnet.rippletest.net:51233",
    "wss://testnet.xrpl-labs.com",
    "wss://xrplcluster.com",
];

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;
const CONNECT_TIMEOUT_MS = 15000;

async function connectWithTimeout(client: xrpl.Client, timeoutMs: number): Promise<void> {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error(`Connection timed out after ${timeoutMs}ms`));
        }, timeoutMs);
        client.connect().then(() => {
            clearTimeout(timer);
            resolve();
        }).catch((err) => {
            clearTimeout(timer);
            reject(err);
        });
    });
}

async function connectWithRetry(): Promise<xrpl.Client> {
    const envRpc = process.env.NEXT_PUBLIC_XRPL_RPC;
    const endpoints = envRpc ? [envRpc, ...RPC_ENDPOINTS.filter(e => e !== envRpc)] : RPC_ENDPOINTS;

    let lastError: Error | null = null;

    for (const rpc of endpoints) {
        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                console.log(`[XRPL] Connecting to ${rpc} (attempt ${attempt}/${MAX_RETRIES})...`);
                const client = new xrpl.Client(rpc);
                await connectWithTimeout(client, CONNECT_TIMEOUT_MS);
                console.log(`[XRPL] Connected to ${rpc}`);
                return client;
            } catch (err: any) {
                lastError = err;
                console.warn(`[XRPL] Failed to connect to ${rpc} (attempt ${attempt}):`, err.message);
                if (attempt < MAX_RETRIES) {
                    await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
                }
            }
        }
    }
    throw new Error(`Failed to connect to any XRPL endpoint after retrying. Last error: ${lastError?.message}`);
}

export async function POST(req: NextRequest) {
    let client: xrpl.Client | null = null;

    try {
        const { query } = await req.json();

        // ── Connect to XRPL Testnet with retry logic
        client = await connectWithRetry();

        // ── Load wallet from seed (or generate a funded testnet wallet)
        let wallet: xrpl.Wallet;
        if (process.env.NEXT_PUBLIC_TESTNET_SEED) {
            wallet = xrpl.Wallet.fromSeed(process.env.NEXT_PUBLIC_TESTNET_SEED);
        } else {
            const fundResult = await client.fundWallet(null, {
                faucetHost: "faucet.altnet.rippletest.net",
            });
            wallet = fundResult.wallet;
        }

        // ── Get current ledger info for timing
        const ledgerResult = await client.request({ command: "ledger", ledger_index: "current" });
        const currentLedger = (ledgerResult.result as any).ledger_index as number;

        // ── Build EscrowCreate transaction
        const destinationAddress =
            process.env.NEXT_PUBLIC_DESTINATION_ADDRESS ||
            "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe";

        // Demo: 5 XRP as proxy for RLUSD (avoids trust line setup)
        const amountDrops = xrpl.xrpToDrops("5");

        const escrowTx: xrpl.EscrowCreate = {
            TransactionType: "EscrowCreate",
            Account: wallet.address,
            Amount: amountDrops,
            Destination: destinationAddress,
            FinishAfter: xrpl.isoTimeToRippleTime(
                new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
            ),
        };

        // ── Autofill, sign, and submit
        const prepared = await client.autofill(escrowTx);
        const signed = wallet.sign(prepared);
        const result = await client.submitAndWait(signed.tx_blob);

        const meta = result.result.meta as any;
        const txResult = typeof meta === "object" ? meta?.TransactionResult : undefined;

        if (txResult !== "tesSUCCESS") {
            return NextResponse.json(
                { error: `Transaction failed: ${txResult}` },
                { status: 400 }
            );
        }

        return NextResponse.json({
            hash: result.result.hash,
            account: wallet.address,
            destination: destinationAddress,
            amount: "5 XRP (RLUSD proxy)",
            ledger: result.result.ledger_index,
        });
    } catch (err: any) {
        console.error("[XRPL Deploy Error]", err);
        return NextResponse.json(
            { error: err.message || "Unexpected error during deployment." },
            { status: 500 }
        );
    } finally {
        if (client?.isConnected()) {
            await client.disconnect();
        }
    }
}
