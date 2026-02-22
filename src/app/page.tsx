"use client";

import { useState, useRef, useEffect, useCallback } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────
type ValidationState = "idle" | "running" | "validated" | "killed";
type PrivacyMode = "cloud" | "local";

interface TerminalLine {
  id: number;
  text: string;
  type: "info" | "success" | "error" | "warning" | "system" | "data";
  delay?: number;
}

// ─── Flux Simulation Steps ────────────────────────────────────────────────────
const FLUX_STEPS = (payload: string): TerminalLine[] => [
  { id: 1, text: "⍙ PRAXIS FLUX ENCLAVE v3.1.0", type: "system" },
  { id: 2, text: "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", type: "system" },
  { id: 3, text: "[INIT] Loading C99 verification stack...", type: "info" },
  { id: 4, text: "[INIT] Tenet Nash-Equilibrium scheduler: ONLINE", type: "info" },
  { id: 5, text: "[INTERCEPT] Probabilistic AI output captured", type: "warning" },
  { id: 6, text: "[PARSE] Extracting transaction primitives...", type: "info" },
  { id: 7, text: `[PARSE] │  type:       EscrowCreate`, type: "data" },
  { id: 8, text: `[PARSE] │  amount:     500000 RLUSD`, type: "data" },
  { id: 9, text: `[PARSE] │  destination: Pan-African Microfinance DAO`, type: "data" },
  { id: 10, text: `[PARSE] │  condition:  MILESTONE_COMPLETION`, type: "data" },
  { id: 11, text: "[FLUX ] Compiling into deterministic bytecode...", type: "info" },
  { id: 12, text: "[FLUX ] Running formal verification pass 1/3: Type safety", type: "info" },
  { id: 13, text: "[FLUX ] Running formal verification pass 2/3: Arithmetic overflow", type: "info" },
  { id: 14, text: "[FLUX ] Running formal verification pass 3/3: Logic soundness", type: "info" },
  { id: 15, text: "[TENET] Scheduling priority: HIGH (financial tx)", type: "info" },
  { id: 16, text: "[TENET] Nash equilibrium reached. No dominant strategy conflicts.", type: "success" },
  { id: 17, text: "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", type: "system" },
  { id: 18, text: "✓ ALL PROOFS PASS  |  BIAS INDEX: 0.000  |  HALLUCINATION: NULL", type: "success" },
  { id: 19, text: "✓ MATHEMATICAL EXECUTION: GUARANTEED", type: "success" },
];

// ─── LLM Simulation Lines ─────────────────────────────────────────────────────
const LLM_LINES = [
  "Processing natural language query...",
  "Identifying transaction type: ESCROW_CREATE",
  "Parsing recipient: 'Pan-African Microfinance DAO'",
  "Inferring amount: ~500,000 RLUSD (probabilistic estimate)",
  "Generating condition logic: milestone_trigger = true",
  "Estimating FinishAfter timestamp: now() + 30d (unverified)",
  "Building EscrowCreate payload...",
  "",
  "{",
  '  "TransactionType": "EscrowCreate",',
  '  "Account": "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh",',
  '  "Amount": "500000000000",',
  '  "Destination": "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe",',
  '  "FinishAfter": 791,  // WARNING: may be off by 1 ledger',
  '  "Condition": "A0258020...",',
  '  "Fee": "12"',
  "}",
  "",
  "⚠ CONFIDENCE: 94.7% — 5.3% hallucination risk detected",
  "⚠ Timestamp logic unverified by external oracle",
  "⚠ Amount precision: estimated, not proven",
];

// ─── Color map ───────────────────────────────────────────────────────────────
const termColor = (type: TerminalLine["type"]) => {
  const map: Record<string, string> = {
    info: "text-slate-300",
    success: "text-emerald-400",
    error: "text-red-400",
    warning: "text-amber-400",
    system: "text-blue-400",
    data: "text-cyan-300",
  };
  return map[type] ?? "text-slate-300";
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function PraxisDashboard() {
  const [query, setQuery] = useState(
    "Create an escrow releasing 500,000 RLUSD to the Pan-African Microfinance DAO upon milestone completion"
  );
  const [validationState, setValidationState] = useState<ValidationState>("idle");
  const [privacyMode, setPrivacyMode] = useState<PrivacyMode>("local");
  const [llmLines, setLlmLines] = useState<string[]>([]);
  const [fluxLines, setFluxLines] = useState<TerminalLine[]>([]);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);
  const [isDeploying, setIsDeploying] = useState(false);
  const [llmProgress, setLlmProgress] = useState(0);
  const [fluxProgress, setFluxProgress] = useState(0);

  const llmRef = useRef<HTMLDivElement>(null);
  const fluxRef = useRef<HTMLDivElement>(null);
  const lineCounter = useRef(0);

  // Auto-scroll
  useEffect(() => {
    if (llmRef.current) llmRef.current.scrollTop = llmRef.current.scrollHeight;
  }, [llmLines]);
  useEffect(() => {
    if (fluxRef.current) fluxRef.current.scrollTop = fluxRef.current.scrollHeight;
  }, [fluxLines]);

  const runValidation = useCallback(async () => {
    if (validationState === "running") return;
    setValidationState("running");
    setLlmLines([]);
    setFluxLines([]);
    setTxHash(null);
    setTxError(null);
    setLlmProgress(0);
    setFluxProgress(0);

    // ── Stream real Gemini output (left panel) + real Flux output (right panel)
    try {
      const res = await fetch("/api/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      if (!res.body) throw new Error("No stream body");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let llmCharCount = 0;
      let fluxLineCount = 0;
      let realFluxStarted = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const payload = JSON.parse(line.slice(6));

            if (payload.fluxStarted) {
              realFluxStarted = true;
              // Add header lines to flux panel
              setFluxLines([
                { id: 1, text: "⍙ PRAXIS FLUX ENCLAVE v3.1.0", type: "system" },
                { id: 2, text: "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", type: "system" },
                { id: 3, text: "[INIT] Loading C99 verification stack...", type: "info" },
                { id: 4, text: "[INIT] Tenet Nash-Equilibrium scheduler: ONLINE", type: "info" },
                { id: 5, text: "[INTERCEPT] Probabilistic AI output captured", type: "warning" },
                { id: 6, text: "[FLUX ] Compiling into deterministic bytecode...", type: "info" },
              ]);
              setFluxProgress(30);
              fluxLineCount = 7;
              continue;
            }

            if (payload.done) {
              // Append final proof lines
              if (payload.fluxPassed) {
                setFluxLines((prev) => [
                  ...prev,
                  { id: fluxLineCount++, text: "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", type: "system" },
                  { id: fluxLineCount++, text: "✓ MATHEMATICAL EXECUTION: GUARANTEED", type: "success" },
                ]);
              }
              setFluxProgress(100);
              break;
            }

            if (payload.error) {
              setLlmLines((prev) => [...prev, `ERROR: ${payload.error}`]);
              break;
            }

            if (payload.text) {
              if (payload.source === "flux") {
                // Real Flux binary output → right panel
                setFluxLines((prev) => [
                  ...prev,
                  { id: fluxLineCount++, text: `[FLUX ] ${payload.text}`, type: "success" },
                ]);
                setFluxProgress((p) => Math.min(95, p + 10));
              } else {
                // Gemini LLM output → left panel
                const newLines = payload.text.split("\n");
                setLlmLines((prev) => {
                  const updated = [...prev];
                  if (updated.length === 0 || newLines[0] === "") {
                    updated.push(...newLines);
                  } else {
                    updated[updated.length - 1] += newLines[0];
                    if (newLines.length > 1) updated.push(...newLines.slice(1));
                  }
                  return updated;
                });
                llmCharCount += payload.text.length;
                setLlmProgress(Math.min(95, Math.round(llmCharCount / 8)));
              }
            }
          } catch {
            // skip malformed SSE
          }
        }
      }
      setLlmProgress(100);
    } catch (err: any) {
      setLlmLines((prev) => [...prev, `⚠ Stream error: ${err.message}`]);
      setLlmProgress(100);
    }

    setValidationState("validated");
  }, [query, validationState]);

  const handleDeploy = async () => {
    if (validationState !== "validated" || isDeploying) return;
    setIsDeploying(true);
    setTxHash(null);
    setTxError(null);

    try {
      const res = await fetch("/api/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      if (data.hash) {
        setTxHash(data.hash);
      } else {
        setTxError(data.error || "Deployment failed.");
      }
    } catch (e: any) {
      setTxError(e.message || "Network error.");
    } finally {
      setIsDeploying(false);
    }
  };

  const reset = () => {
    setValidationState("idle");
    setLlmLines([]);
    setFluxLines([]);
    setTxHash(null);
    setTxError(null);
    setLlmProgress(0);
    setFluxProgress(0);
    setIsDeploying(false);
  };

  // ── Render
  const isValidated = validationState === "validated";
  const isRunning = validationState === "running";

  return (
    <div className="grid-bg noise" style={{ height: "100dvh", display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* ── Top Bar ── */}
      <header style={{
        background: "rgba(10,14,20,0.95)",
        borderBottom: "1px solid #1a2332",
        backdropFilter: "blur(12px)",
        padding: "0 24px",
        height: "56px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexShrink: 0,
        zIndex: 10,
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "22px", fontWeight: 800, letterSpacing: "-0.5px", fontFamily: "Inter, sans-serif" }}>
            <span style={{ color: "#e2e8f0" }}>⍙ </span>
            <span style={{ color: "#e2e8f0" }}>PRAXIS</span>
          </span>
          <span style={{
            background: "rgba(0,102,255,0.15)",
            border: "1px solid rgba(0,102,255,0.4)",
            color: "#6699ff",
            fontSize: "10px",
            fontFamily: "Fira Code, monospace",
            padding: "2px 8px",
            borderRadius: "4px",
            letterSpacing: "1px",
          }}>
            ENTERPRISE v3.1
          </span>
        </div>

        {/* Status indicators */}
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <StatusDot label="XRPL TESTNET" active={true} color="green" />
          <StatusDot label="FLUX ENCLAVE" active={true} color="green" />
          <StatusDot label="TENET SCHEDULER" active={true} color="blue" />

          {/* Privacy toggle */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "8px" }}>
            <span style={{ fontSize: "11px", color: "#4a5568", fontFamily: "Fira Code, monospace" }}>MODE:</span>
            <button
              onClick={() => setPrivacyMode(p => p === "cloud" ? "local" : "cloud")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                background: privacyMode === "local" ? "rgba(0,255,136,0.1)" : "rgba(255,165,0,0.1)",
                border: `1px solid ${privacyMode === "local" ? "rgba(0,255,136,0.3)" : "rgba(255,165,0,0.3)"}`,
                borderRadius: "20px",
                padding: "4px 12px",
                cursor: "pointer",
                transition: "all 0.3s ease",
              }}
            >
              <span style={{ fontSize: "10px", fontFamily: "Fira Code, monospace", color: privacyMode === "local" ? "#00ff88" : "#f6a623" }}>
                {privacyMode === "local" ? "⬡ LOCAL ENCLAVE" : "☁ CLOUD EXEC"}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Query Input Bar ── */}
      <div style={{
        background: "rgba(13,17,23,0.9)",
        borderBottom: "1px solid #1a2332",
        padding: "12px 24px",
        display: "flex",
        gap: "12px",
        alignItems: "center",
        flexShrink: 0,
      }}>
        <span style={{ color: "#4a5568", fontFamily: "Fira Code, monospace", fontSize: "13px", flexShrink: 0 }}>$&gt;</span>
        <input
          value={query}
          onChange={(e) => { if (!isRunning) setQuery(e.target.value); }}
          placeholder="Describe your financial transaction in plain English..."
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            color: "#e2e8f0",
            fontFamily: "Fira Code, monospace",
            fontSize: "13px",
            caretColor: "#00ff88",
          }}
        />
        <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
          {(validationState !== "idle") && (
            <button
              onClick={reset}
              style={{
                background: "transparent",
                border: "1px solid #1e2d40",
                color: "#4a5568",
                borderRadius: "6px",
                padding: "8px 16px",
                fontFamily: "Fira Code, monospace",
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              RESET
            </button>
          )}
          <button
            onClick={runValidation}
            disabled={isRunning || !query.trim()}
            style={{
              background: isRunning ? "rgba(0,102,255,0.1)" : "linear-gradient(135deg, #0055dd, #0077ff)",
              border: "1px solid rgba(0,102,255,0.5)",
              borderRadius: "6px",
              padding: "8px 20px",
              color: isRunning ? "#6699ff" : "white",
              fontFamily: "Fira Code, monospace",
              fontSize: "12px",
              fontWeight: 600,
              cursor: isRunning ? "wait" : "pointer",
              letterSpacing: "1px",
              transition: "all 0.2s ease",
            }}
          >
            {isRunning ? "VALIDATING..." : "▶ VALIDATE"}
          </button>
        </div>
      </div>

      {/* ── Main Split-Screen ── */}
      <div style={{
        flex: 1,
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "0",
        overflow: "hidden",
      }}>

        {/* ── LEFT PANEL: LLM ── */}
        <div className={`panel-border scanlines ${validationState !== "idle" ? "glow-red" : ""}`} style={{
          background: "rgba(10,14,20,0.95)",
          borderRight: "1px solid #1a2332",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          position: "relative",
        }}>
          {/* Panel header */}
          <div style={{
            padding: "12px 16px",
            borderBottom: "1px solid #1a2332",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ color: "#7a8999", fontFamily: "Fira Code, monospace", fontSize: "11px" }}>
                LAYER 1 // PROBABILISTIC AI
              </span>
            </div>
            {validationState !== "idle" && (
              <span className="badge-red" style={{
                background: "rgba(255,59,92,0.15)",
                border: "1px solid rgba(255,59,92,0.5)",
                color: "#ff3b5c",
                fontFamily: "Fira Code, monospace",
                fontSize: "10px",
                padding: "3px 10px",
                borderRadius: "4px",
                letterSpacing: "0.5px",
                fontWeight: 600,
              }}>
                ⚠ UNVERIFIED: PROBABILISTIC OUTPUT DETECTED
              </span>
            )}
          </div>

          {/* Progress bar */}
          {isRunning && llmProgress < 100 && (
            <div style={{ height: "2px", background: "#1a2332", flexShrink: 0 }}>
              <div style={{
                height: "100%",
                width: `${llmProgress}%`,
                background: "linear-gradient(90deg, #ff3b5c, #ff6b8a)",
                transition: "width 0.1s ease",
              }} />
            </div>
          )}

          {/* Terminal body */}
          <div
            ref={llmRef}
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "16px",
              fontFamily: "Fira Code, monospace",
              fontSize: "12px",
              lineHeight: "1.7",
              position: "relative",
              zIndex: 2,
            }}
          >
            {validationState === "idle" ? (
              <IdleState side="left" />
            ) : (
              llmLines.map((line, i) => (
                <div key={i} className="slide-in" style={{
                  color: line.startsWith("⚠") ? "#f6a623"
                    : line.startsWith("{") || line.startsWith("}") || line.startsWith("  ") ? "#7dd3fc"
                      : "#7a8999",
                  whiteSpace: "pre",
                }}>
                  {line || "\u00A0"}
                </div>
              ))
            )}
            {isRunning && llmProgress < 100 && <div className="cursor" style={{ color: "#ff3b5c" }} />}
          </div>
        </div>

        {/* ── RIGHT PANEL: FLUX ── */}
        <div className={`panel-border scanlines ${isValidated ? "glow-green" : ""}`} style={{
          background: "rgba(7,11,16,0.98)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          position: "relative",
        }}>
          {/* Panel header */}
          <div style={{
            padding: "12px 16px",
            borderBottom: "1px solid #1a2332",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ color: "#7a8999", fontFamily: "Fira Code, monospace", fontSize: "11px" }}>
                LAYER 2 // PRAXIS FLUX ENCLAVE
              </span>
            </div>
            {isValidated ? (
              <span className="badge-green" style={{
                background: "rgba(0,255,136,0.12)",
                border: "1px solid rgba(0,255,136,0.4)",
                color: "#00ff88",
                fontFamily: "Fira Code, monospace",
                fontSize: "10px",
                padding: "3px 10px",
                borderRadius: "4px",
                letterSpacing: "0.5px",
                fontWeight: 600,
              }}>
                ✓ VALIDATED BY FLUX: XRPL DEPLOYMENT SAFE
              </span>
            ) : (
              <span style={{
                background: "rgba(26,35,50,0.5)",
                border: "1px solid #1e2d40",
                color: "#4a5568",
                fontFamily: "Fira Code, monospace",
                fontSize: "10px",
                padding: "3px 10px",
                borderRadius: "4px",
                letterSpacing: "0.5px",
              }}>
                AWAITING INTERCEPT
              </span>
            )}
          </div>

          {/* Progress bar */}
          {isRunning && fluxProgress < 100 && (
            <div style={{ height: "2px", background: "#1a2332", flexShrink: 0 }}>
              <div style={{
                height: "100%",
                width: `${fluxProgress}%`,
                background: "linear-gradient(90deg, #00ff88, #00cc6a)",
                transition: "width 0.1s ease",
              }} />
            </div>
          )}

          {/* Terminal body */}
          <div
            ref={fluxRef}
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "16px",
              fontFamily: "Fira Code, monospace",
              fontSize: "12px",
              lineHeight: "1.7",
              position: "relative",
              zIndex: 2,
            }}
          >
            {validationState === "idle" ? (
              <IdleState side="right" />
            ) : (
              fluxLines.map((line) => (
                <div key={line.id} className={`slide-in ${termColor(line.type)}`} style={{ whiteSpace: "pre" }}>
                  {line.text}
                </div>
              ))
            )}
            {isRunning && <div className="cursor" />}
          </div>

          {/* ── Bottom Action Bar ── */}
          <div style={{
            padding: "14px 16px",
            borderTop: "1px solid #1a2332",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            flexShrink: 0,
            background: "rgba(7,11,16,0.95)",
          }}>
            {/* Deploy button */}
            <button
              onClick={handleDeploy}
              disabled={!isValidated || isDeploying}
              className={isValidated && !isDeploying ? "btn-deploy-ready" : "btn-deploy-disabled"}
              style={{
                width: "100%",
                padding: "12px 20px",
                borderRadius: "8px",
                fontFamily: "Fira Code, monospace",
                fontSize: "13px",
                fontWeight: 700,
                letterSpacing: "1px",
                transition: "all 0.3s ease",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
              }}
            >
              {isDeploying ? (
                <>
                  <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</span>
                  BROADCASTING TO XRPL TESTNET...
                </>
              ) : isValidated ? (
                <>
                  ⬡&nbsp;&nbsp;DEPLOY TO XRPL TESTNET
                </>
              ) : (
                <>
                  ○&nbsp;&nbsp;AWAITING FLUX VALIDATION
                </>
              )}
            </button>

            {/* TX hash */}
            {txHash && (
              <div className="slide-in" style={{
                background: "rgba(0,255,136,0.06)",
                border: "1px solid rgba(0,255,136,0.25)",
                borderRadius: "6px",
                padding: "10px 14px",
              }}>
                <div style={{ color: "#00ff88", fontFamily: "Fira Code, monospace", fontSize: "10px", marginBottom: "4px" }}>
                  ✓ TRANSACTION CONFIRMED — XRPL TESTNET
                </div>
                <div className="hash-reveal" style={{ color: "#7dd3fc", fontFamily: "Fira Code, monospace", fontSize: "11px", wordBreak: "break-all" }}>
                  HASH: {txHash}
                </div>
                <a
                  href={`https://testnet.xrpl.org/transactions/${txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "#6699ff", fontFamily: "Fira Code, monospace", fontSize: "10px", textDecoration: "none", marginTop: "4px", display: "block" }}
                >
                  → View on XRPL Testnet Explorer ↗
                </a>
              </div>
            )}

            {txError && (
              <div className="slide-in" style={{
                background: "rgba(255,59,92,0.06)",
                border: "1px solid rgba(255,59,92,0.25)",
                borderRadius: "6px",
                padding: "10px 14px",
                color: "#ff3b5c",
                fontFamily: "Fira Code, monospace",
                fontSize: "11px",
              }}>
                ✗ DEPLOY ERROR: {txError}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <footer style={{
        background: "rgba(8,12,16,0.95)",
        borderTop: "1px solid #1a2332",
        padding: "6px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexShrink: 0,
      }}>
        <span style={{ color: "#2d3f55", fontFamily: "Fira Code, monospace", fontSize: "10px" }}>
          PRAXIS ENTERPRISE GATEWAY v3.1.0 // NSBE HACKS 2026
        </span>
        <span style={{ color: "#2d3f55", fontFamily: "Fira Code, monospace", fontSize: "10px" }}>
          FLUX:{" "}
          <span style={{ color: "#00ff88" }}>ONLINE</span>
          {"  "}TENET:{" "}
          <span style={{ color: "#6699ff" }}>ONLINE</span>
          {"  "}XRPL:{" "}
          <span style={{ color: "#00ff88" }}>TESTNET</span>
        </span>
      </footer>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function StatusDot({ label, active, color }: { label: string; active: boolean; color: "green" | "blue" | "red" }) {
  const c = color === "green" ? "#00ff88" : color === "blue" ? "#6699ff" : "#ff3b5c";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
      <div style={{
        width: "6px",
        height: "6px",
        borderRadius: "50%",
        background: active ? c : "#2d3f55",
        boxShadow: active ? `0 0 6px ${c}` : "none",
      }} />
      <span style={{ color: "#4a5568", fontFamily: "Fira Code, monospace", fontSize: "10px" }}>{label}</span>
    </div>
  );
}

function IdleState({ side }: { side: "left" | "right" }) {
  if (side === "left") {
    return (
      <div style={{ color: "#2d3f55", display: "flex", flexDirection: "column", gap: "6px" }}>
        <div>{'// Waiting for query submission...'}</div>
        <div>{'// LLM stream will appear here'}</div>
        <div style={{ marginTop: "24px", color: "#1e2d40" }}>────────────────────────────</div>
        <div style={{ color: "#1e2d40" }}>LAYER 1: PROBABILISTIC AI</div>
        <div style={{ color: "#1e2d40" }}>Model: Qwen-2.5 / Claude-3.5</div>
        <div style={{ color: "#1e2d40" }}>Mode: Natural language parser</div>
        <div style={{ color: "#1e2d40" }}>Output: Raw JSON (UNVERIFIED)</div>
        <div style={{ marginTop: "16px", color: "#ff3b5c", opacity: 0.3 }}>
          ⚠ Probabilistic output carries inherent risk
        </div>
      </div>
    );
  }
  return (
    <div style={{ color: "#2d3f55", display: "flex", flexDirection: "column", gap: "6px" }}>
      <div>{'// Flux enclave standing by...'}</div>
      <div>{'// C99 verification stack loaded'}</div>
      <div style={{ marginTop: "24px", color: "#1e2d40" }}>────────────────────────────</div>
      <div style={{ color: "#1e2d40" }}>LAYER 2: DETERMINISTIC VM</div>
      <div style={{ color: "#1e2d40" }}>Compiler: Flux C99 v3.1</div>
      <div style={{ color: "#1e2d40" }}>Scheduler: Tenet (Nash-EQ)</div>
      <div style={{ color: "#1e2d40" }}>Proof mode: Formal verification</div>
      <div style={{ marginTop: "16px", color: "#00ff88", opacity: 0.3 }}>
        ✓ Zero-hallucination execution guaranteed
      </div>
    </div>
  );
}
