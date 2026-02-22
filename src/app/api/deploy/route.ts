import { NextRequest, NextResponse } from "next/server";
import * as xrpl from "xrpl";
import { validateEscrowCreate } from "@/lib/xrpl-validator";
import { validateEscrowTiming } from "@/lib/xrpl-escrow-validator";
import { getConnectionPool } from "@/lib/xrpl-connection-pool";

export async function POST(req: NextRequest) {
    const pool = getConnectionPool();
    let client: xrpl.Client | null = null;

    try {
        const { query } = await req.json();

        // ── Acquire a pooled connection to XRPL Testnet
        client = await pool.acquire();

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

        // ── Get current ledger info for timing validation
        const ledgerResult = await client.request({ command: "ledger", ledger_index: "current" });
        const ledgerInfo = ledgerResult.result as any;

        // ── Build EscrowCreate transaction
        const destinationAddress =
            process.env.NEXT_PUBLIC_DESTINATION_ADDRESS ||
            "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe";

        // Demo: 5 XRP as proxy for RLUSD (avoids trust line setup)
        const amountDrops = xrpl.xrpToDrops("5");

        const finishAfter = xrpl.isoTimeToRippleTime(
            new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
        );

        const escrowTx: xrpl.EscrowCreate = {
            TransactionType: "EscrowCreate",
            Account: wallet.address,
            Amount: amountDrops,
            Destination: destinationAddress,
            FinishAfter: finishAfter,
        };

        // ── Phase 1: Offline syntax validation (avoids malformed network calls)
        const syntaxResult = validateEscrowCreate(escrowTx as unknown as Record<string, unknown>);
        if (!syntaxResult.valid) {
            console.warn("[XRPL] Offline validation failed:", syntaxResult.errors);
            return NextResponse.json(
                { error: `Payload validation failed: ${syntaxResult.errors.join("; ")}` },
                { status: 400 }
            );
        }
        if (syntaxResult.warnings.length > 0) {
            console.warn("[XRPL] Validation warnings:", syntaxResult.warnings);
        }

        // ── Phase 2: Strict escrow timing validation (clock drift protection)
        const ledgerCloseTime = ledgerInfo.ledger?.close_time as number | undefined;
        const timingResult = validateEscrowTiming(finishAfter, undefined, ledgerCloseTime);
        if (!timingResult.valid) {
            console.warn("[XRPL] Escrow timing validation failed:", timingResult.errors);
            return NextResponse.json(
                { error: `Escrow timing error: ${timingResult.errors.join("; ")}` },
                { status: 400 }
            );
        }
        if (timingResult.warnings.length > 0) {
            console.warn("[XRPL] Escrow timing warnings:", timingResult.warnings);
        }

        // ── Phase 3: Autofill, sign, and submit
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
        // ── Release connection back to pool (instead of disconnecting)
        if (client) {
            pool.release(client);
        }
    }
}
