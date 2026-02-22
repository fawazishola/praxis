import * as xrpl from "xrpl";

// ── Strict Escrow Condition Timestamp Validator ─────────────────────────────
// Validates FinishAfter / CancelAfter timeline logic for EscrowCreate,
// preventing deployment errors from AI-generated timestamps with clock drift
// or inverted time windows.

export interface EscrowTimingResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}

/**
 * Maximum allowed clock drift tolerance (in seconds).
 * Accounts for slight differences between local system time and ledger close time.
 */
const CLOCK_DRIFT_TOLERANCE_SEC = 15;

/**
 * Minimum escrow duration (in seconds). Escrows shorter than this
 * are likely erroneous AI outputs.
 */
const MIN_ESCROW_DURATION_SEC = 60;

/**
 * Maximum escrow duration: 10 years (in seconds).
 * Escrows longer than this are likely malformed.
 */
const MAX_ESCROW_DURATION_SEC = 10 * 365 * 24 * 60 * 60;

/**
 * Converts a Unix timestamp (seconds since 1970-01-01) to Ripple epoch
 * (seconds since 2000-01-01T00:00:00Z). The Ripple epoch offset is 946684800.
 */
function unixToRippleTime(unixSeconds: number): number {
    return unixSeconds - 946684800;
}

/**
 * Returns the current time as a Ripple epoch timestamp.
 */
function nowAsRippleTime(): number {
    return unixToRippleTime(Math.floor(Date.now() / 1000));
}

/**
 * Validates the timing fields (FinishAfter, CancelAfter) of an EscrowCreate
 * transaction. Ensures:
 *  - Timestamps are not in the past (accounting for clock drift)
 *  - FinishAfter < CancelAfter when both are present
 *  - Escrow duration falls within reasonable bounds
 *  - CancelAfter is not accidentally set before FinishAfter (common AI mistake)
 *
 * @param finishAfter  Ripple epoch timestamp for FinishAfter (optional)
 * @param cancelAfter  Ripple epoch timestamp for CancelAfter (optional)
 * @param ledgerCloseTime  Current ledger close time in Ripple epoch (optional; uses system clock if absent)
 */
export function validateEscrowTiming(
    finishAfter?: number,
    cancelAfter?: number,
    ledgerCloseTime?: number,
): EscrowTimingResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const referenceTime = ledgerCloseTime ?? nowAsRippleTime();

    // At least one timing condition should be set
    if (finishAfter === undefined && cancelAfter === undefined) {
        warnings.push(
            "Neither FinishAfter nor CancelAfter is set. Ensure a crypto-condition is provided, otherwise the escrow cannot be executed or cancelled."
        );
        return { valid: true, errors, warnings };
    }

    // ── FinishAfter checks ──
    if (finishAfter !== undefined) {
        if (!Number.isFinite(finishAfter) || finishAfter < 0) {
            errors.push(`FinishAfter must be a positive finite number, got ${finishAfter}`);
        } else if (finishAfter <= referenceTime - CLOCK_DRIFT_TOLERANCE_SEC) {
            errors.push(
                `FinishAfter (${finishAfter}) is in the past relative to ledger close time (${referenceTime}). ` +
                `This will cause the escrow to be immediately finishable or rejected.`
            );
        } else if (finishAfter <= referenceTime + CLOCK_DRIFT_TOLERANCE_SEC) {
            warnings.push(
                `FinishAfter (${finishAfter}) is very close to the current ledger time (${referenceTime}). ` +
                `Clock drift may cause unexpected behavior.`
            );
        }
    }

    // ── CancelAfter checks ──
    if (cancelAfter !== undefined) {
        if (!Number.isFinite(cancelAfter) || cancelAfter < 0) {
            errors.push(`CancelAfter must be a positive finite number, got ${cancelAfter}`);
        } else if (cancelAfter <= referenceTime - CLOCK_DRIFT_TOLERANCE_SEC) {
            errors.push(
                `CancelAfter (${cancelAfter}) is in the past relative to ledger close time (${referenceTime}). ` +
                `The escrow would be immediately cancellable.`
            );
        }
    }

    // ── Relative ordering ──
    if (finishAfter !== undefined && cancelAfter !== undefined) {
        if (cancelAfter <= finishAfter) {
            errors.push(
                `CancelAfter (${cancelAfter}) must be strictly after FinishAfter (${finishAfter}). ` +
                `An escrow that can be cancelled before it can be finished is invalid.`
            );
        }

        // Duration sanity
        const duration = cancelAfter - finishAfter;
        if (duration > 0 && duration < MIN_ESCROW_DURATION_SEC) {
            warnings.push(
                `Escrow window between FinishAfter and CancelAfter is only ${duration} seconds. ` +
                `This is unusually short and may not allow enough time to finish the escrow.`
            );
        }
    }

    // ── Duration bounds (relative to now) ──
    if (finishAfter !== undefined) {
        const offsetFromNow = finishAfter - referenceTime;
        if (offsetFromNow > MAX_ESCROW_DURATION_SEC) {
            warnings.push(
                `FinishAfter is ${Math.round(offsetFromNow / 86400)} days from now, ` +
                `which exceeds the recommended maximum of ${Math.round(MAX_ESCROW_DURATION_SEC / 86400)} days.`
            );
        }
    }

    if (cancelAfter !== undefined) {
        const offsetFromNow = cancelAfter - referenceTime;
        if (offsetFromNow > MAX_ESCROW_DURATION_SEC) {
            warnings.push(
                `CancelAfter is ${Math.round(offsetFromNow / 86400)} days from now, ` +
                `which exceeds the recommended maximum of ${Math.round(MAX_ESCROW_DURATION_SEC / 86400)} days.`
            );
        }
    }

    return { valid: errors.length === 0, errors, warnings };
}
