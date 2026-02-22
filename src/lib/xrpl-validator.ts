import * as xrpl from "xrpl";

// ── Offline XRPL Transaction Validator ──────────────────────────────────────
// Validates EscrowCreate payloads locally before submitting to the network,
// avoiding wasted network calls on malformed AI-generated outputs.

export interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}

/**
 * Validates that a string is a valid XRP Ledger classic address.
 */
function isValidAddress(address: string): boolean {
    return xrpl.isValidClassicAddress(address);
}

/**
 * Validates that a drops amount string is a positive integer within XRP bounds.
 * Max XRP supply = 100,000,000,000 XRP = 100,000,000,000,000,000 drops.
 */
function isValidDropsAmount(drops: string): boolean {
    const MAX_DROPS = BigInt("100000000000000000");
    try {
        const val = BigInt(drops);
        return val > BigInt(0) && val <= MAX_DROPS;
    } catch {
        return false;
    }
}

/**
 * Validates an EscrowCreate transaction payload offline.
 * Checks structure, types, addresses, amounts, and basic field presence.
 */
export function validateEscrowCreate(tx: xrpl.EscrowCreate | Record<string, unknown>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // TransactionType
    if (tx.TransactionType !== "EscrowCreate") {
        errors.push(`TransactionType must be "EscrowCreate", got "${tx.TransactionType}"`);
    }

    // Account
    if (typeof tx.Account !== "string" || !tx.Account) {
        errors.push("Account is required and must be a string");
    } else if (!isValidAddress(tx.Account)) {
        errors.push(`Account "${tx.Account}" is not a valid XRPL address`);
    }

    // Destination
    if (typeof tx.Destination !== "string" || !tx.Destination) {
        errors.push("Destination is required and must be a string");
    } else if (!isValidAddress(tx.Destination)) {
        errors.push(`Destination "${tx.Destination}" is not a valid XRPL address`);
    }

    // Amount
    if (typeof tx.Amount !== "string" || !tx.Amount) {
        errors.push("Amount is required and must be a string (drops)");
    } else if (!isValidDropsAmount(tx.Amount)) {
        errors.push(`Amount "${tx.Amount}" is not a valid drops value (must be positive integer ≤ max XRP supply)`);
    }

    // Self-send check
    if (tx.Account && tx.Destination && tx.Account === tx.Destination) {
        errors.push("Account and Destination must not be the same address");
    }

    // FinishAfter / CancelAfter — must be numbers if present
    if (tx.FinishAfter !== undefined && typeof tx.FinishAfter !== "number") {
        errors.push("FinishAfter must be a number (Ripple epoch timestamp)");
    }
    if (tx.CancelAfter !== undefined && typeof tx.CancelAfter !== "number") {
        errors.push("CancelAfter must be a number (Ripple epoch timestamp)");
    }

    // At least one condition mechanism required
    if (tx.FinishAfter === undefined && tx.CancelAfter === undefined && tx.Condition === undefined) {
        errors.push("EscrowCreate requires at least one of: FinishAfter, CancelAfter, or Condition");
    }

    // Fee validation
    if (tx.Fee !== undefined) {
        if (typeof tx.Fee !== "string") {
            errors.push("Fee must be a string (drops)");
        } else {
            const fee = parseInt(tx.Fee, 10);
            if (isNaN(fee) || fee < 10) {
                warnings.push("Fee is unusually low (minimum is typically 10 drops)");
            }
            if (fee > 1_000_000) {
                warnings.push(`Fee of ${tx.Fee} drops is unusually high`);
            }
        }
    }

    return { valid: errors.length === 0, errors, warnings };
}

/**
 * General-purpose offline XRPL transaction validator.
 * Validates common fields shared across all transaction types.
 */
export function validateTransaction(tx: Record<string, unknown>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!tx || typeof tx !== "object") {
        return { valid: false, errors: ["Transaction must be a non-null object"], warnings };
    }

    if (typeof tx.TransactionType !== "string") {
        errors.push("TransactionType is required and must be a string");
    }

    if (typeof tx.Account !== "string" || !tx.Account) {
        errors.push("Account is required and must be a string");
    } else if (!isValidAddress(tx.Account)) {
        errors.push(`Account "${tx.Account}" is not a valid XRPL address`);
    }

    // Dispatch to type-specific validator
    if (tx.TransactionType === "EscrowCreate") {
        const specific = validateEscrowCreate(tx);
        errors.push(...specific.errors.filter(e => !errors.includes(e)));
        warnings.push(...specific.warnings);
    }

    return { valid: errors.length === 0, errors, warnings };
}
