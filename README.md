# ⍙ Praxis — The Deterministic AI-to-XRPL Gateway

> **Zero-Hallucination Enterprise Oracle.** Built to bridge probabilistic AI with deterministic Decentralized Finance.

**Founder:** Fawaz Ishola (Solo Developer) | **Event:** NSBEHacks UofT 2026

---

##  Executive Summary

In 2026, institutional finance (TradFi) and Decentralized Finance (DeFi) are converging on ledgers like the XRPL. Institutions want to use AI to generate smart contracts, assess risk, and route liquidity.

**The Problem:** Large Language Models (LLMs) are probabilistic — they guess the next token. In DeFi, a 99% accuracy rate is a 1% catastrophic failure rate. You cannot run a $50M RLUSD Smart Escrow on an AI that might hallucinate. Furthermore, traditional AI models contain historical algorithmic biases that continue to redline marginalized communities out of the financial system.

**The Solution: Praxis.** Praxis is a neurosymbolic API gateway. It uses standard LLMs strictly as a translation layer to parse natural English into raw data. It then routes that data into **Flux**, a proprietary, local, deterministic C99 compiler. If the formal mathematical logic doesn't hold, Praxis kills the transaction. If it proves, Praxis compiles it and deploys it directly to the Ripple Testnet.

**No hallucinations. No algorithmic bias. 100% mathematical certainty.**

---

##  What Praxis Is, Simply

> **Conditional money movement, mathematically guaranteed.**

Praxis lets anyone express a financial condition in plain English — *"release funds when milestone is confirmed"* — and deploys it on-chain with formal mathematical proof, no auditor required.

---

##  What Praxis Replaces & What It Costs

| What You'd Normally Pay | Traditional Cost | Praxis Cost |
|---|---|---|
| Smart contract audit firm | $20,000 – $100,000 | **$0** |
| Escrow attorney | $500 – $5,000 per transaction | **$0** |
| International wire transfer | $25 – $50 + 3–5 day delay | **~$0.0001 XRP fee, instant** |
| Traditional payroll processor | 0.5–2% per transaction | **$0** |
| DAO multisig setup + legal | $10,000+ | **$0** |

### The Numbers

- Standard DeFi smart contract audit: **$50,000 minimum**
- XRPL transaction fee for the same escrow through Praxis: **< $0.001**
- Time saved: from **weeks of back-and-forth with auditors** to **under 60 seconds**

### But It's Not Just About Saving Money

It's about **access**.

The $50K audit isn't just expensive — it's a gatekeeping mechanism. It means only well-funded, well-connected teams get to build secure DeFi. Everyone else either skips the audit (and gets hacked) or doesn't build at all.

**Praxis breaks that gate.** A DAO with $5,000 in their treasury can now deploy with the same mathematical safety as a $50M institutional protocol.

---

##  The "Triple Crown" Alignment

### 1. Ripple Challenge: Enterprise DeFi, Privacy & Programmability

- **DeFi:** Praxis actively generates and deploys RLUSD Smart Escrows on the XRPL Testnet using natural language, secured by mathematical proofs.
- **Privacy:** Financial institutions do not need to send sensitive XRPL ledger data to OpenAI. The AI logic is validated locally inside the Praxis enclave.
- **Programmability:** Non-technical founders can program complex XRPL money flows using plain English, with institutional-grade execution confidence.

### 2. BFN Venture Challenge: Democratizing Secure Web3

Deploying secure DeFi protocols usually requires $50,000+ smart contract audits, pricing out Black founders and exposing community treasuries (DAOs) to devastating hacks. Praxis democratizes institutional-grade smart contract auditing — ensuring Black-led micro-lending protocols can deploy Web3 infrastructure that is mathematically safe and entirely free of racial biases baked into probabilistic LLMs.

### 3. Deep-Tech Systems Engineering (Overall Hackathon)

While standard applications wrap APIs, Praxis utilizes bare-metal systems engineering. It leverages a custom C99 stack virtual machine (**Flux**) and a game-theoretic task scheduler (**Tenet**) to prove mathematical execution with sub-millisecond latency.

---

##  System Architecture

Praxis operates on a strict **Neurosymbolic pipeline**:

```
[Natural Language Input]
        │
        ▼
┌─────────────────────────────┐
│  Neural Layer (Cloud)       │  Gemini 2.0 Flash parses TradFi
│  "Parse, don't compute"     │  queries into rigid JSON. No math.
└─────────────────────────────┘
        │
        ▼
┌─────────────────────────────┐
│  Symbolic Layer (Local)     │  Flux (C99 VM) compiles & verifies.
│  Praxis Flux Enclave        │  Tenet (Nash-Equilibrium scheduler)
│                             │  manages task priority.
└─────────────────────────────┘
        │
     Math holds?
     ┌────┴────┐
    YES        NO
     │          │
     ▼          ▼
  Deploy     Kill Tx
  to XRPL
```

| Layer | Component | Role |
|---|---|---|
| Neural | Gemini 3.1 Pro | Natural language → JSON |
| Symbolic | **Flux** (C99 VM) | Deterministic math verification |
| Scheduler | **Tenet** | Nash-Equilibrium task prioritization |
| Output | `xrpl.js` | Broadcast verified tx to XRPL Testnet |

> **Note:** To comply with hackathon regulations, the `praxis-dashboard` and XRPL integration were built entirely during the 36-hour window. The Flux and Tenet compilers are pre-published proprietary binaries leveraged as the execution environment.

-  [Flux Compiler — Binary Release](https://github.com/fawazishola/flux/releases)
- [Tenet Scheduler — Binary Release](https://github.com/fawazishola/tenet/releases)

---

##  XRPL Developer Feedback *(Bounty Submission)*

During the integration of `xrpl.js` for the RLUSD Smart Escrow generation, I evaluated the SDK from a systems architecture perspective. Here is my feedback for the Ripple Developer Relations team:

**1. Transaction Simulation vs. Validation Latency**
The `xrpl.js` SDK handles submission well, but a local, offline syntax validator native to the SDK would be highly beneficial. Currently, Praxis must rely heavily on its internal Flux compiler to simulate the payload before submitting to the testnet to avoid wasting network calls on malformed AI outputs.

**2. Strict Typing on Escrow Conditions**
In TypeScript, the `EscrowCreate` object is quite forgiving. For enterprise/institutional integrations where AI is generating the Unix timestamp for `CancelAfter` or `FinishAfter`, having a stricter native SDK utility function that validates timeline logic (e.g., ensuring `FinishAfter` isn't accidentally set before ledger close time due to clock drift) would prevent early deployment errors.

**3. WebSocket Client Resource Management**
When running a Next.js serverless architecture, maintaining the `Client` WebSocket connection to `wss://s.altnet.rippletest.net:51233` can lead to hanging promises if not aggressively garbage collected. A built-in connection pooler in the SDK for React/Next.js environments would streamline B2B SaaS adoption significantly.

---

## Running Praxis Locally

**Prerequisites:** Node.js v18+, an active Ripple Testnet Wallet, and a Linux environment.

```bash
# 1. Clone the repository
git clone https://github.com/fawazishola/praxis.git
cd praxis

# 2. Install dependencies (including xrpl.js)
npm install

# 3. Setup Environment Variables
cp .env.example .env.local
# Then edit .env.local and add:
# NEXT_PUBLIC_XRPL_RPC=wss://s.altnet.rippletest.net:51233
# NEXT_PUBLIC_TESTNET_SEED=your_testnet_seed
# GEMINI_API_KEY=your_gemini_api_key

# 4. Run the development server
npm run dev
```

Visit https://www.praxi.live/ to interact with the Zero-Hallucination Gateway.

---

##  Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 + React |
| Styling | Tailwind CSS + Custom CSS |
| XRPL SDK | `xrpl.js` |
| AI Layer | Gemini 2.0 Flash |
| Deterministic VM | Flux (C99, proprietary) |
| Scheduler | Tenet (Nash-Equilibrium, proprietary) |

---

*Built at NSBEHacks 2026. .*
