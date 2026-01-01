# BioChain Docking Agent

## Overview

BioChain Docking Agent is an advanced, AI-powered decentralized application (dApp) designed to streamline the analysis and verification of molecular docking simulations. It bridges the gap between computational chemistry and blockchain technology by providing a platform where researchers can upload docking results, receive instant AI-generated insights via a **Live Agent**, visualize molecular structures, and immutably verify their findings on the Solana blockchain.

This platform addresses the need for transparency, reproducibility, and rapid analysis in the drug discovery pipeline.

## Key Features

1.  **Job Management**: A centralized dashboard to track status, scores, and metadata of multiple docking experiments.
2.  **AI-Driven Analysis (Gemini 3)**: 
    *   **Executive Summaries**: Utilizes `gemini-3-pro-preview` with "Thinking" capabilities to generate deep technical summaries of docking scores and binding efficiencies.
    *   **Live Agent Chat**: An interactive chat interface powered by `gemini-3-flash-preview` allows researchers to ask specific questions about the molecule's properties in real-time.
3.  **Advanced Visualization**: Interactive 3D molecular structure viewer with rotation, pan/zoom controls, hydrogen bond toggles, and snapshot export capabilities.
4.  **On-Chain Verification (Solana Devnet)**: "Sign" scientific results on the Solana blockchain, creating a permanent, tamper-proof record (Proof of Computation) for intellectual property and audit trails.
5.  **Professional Reporting**: Generates comprehensive PDF reports that include high-resolution snapshots of visualizations, charts, and the AI-generated analysis.

## Solana Service & Architecture (Devnet)

BioChain uses the **Solana Blockchain (Devnet)** as an immutable public ledger to verify scientific data. 

### How it Works
Instead of deploying a custom smart contract (Program) for every data entry, BioChain utilizes the **Memo Program** to attach structured binary data to transaction logs. This ensures extremely low costs and high throughput while maintaining cryptographic proof of existence.

*   **Network**: Solana Devnet (`https://api.devnet.solana.com`)
*   **Program ID**: `MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcQb` (SPL Memo Program)
*   **Data Serialization**: **Borsh** (Binary Object Representation Serializer for Hashing). 
    *   Data is packed into a compact binary format before being sent to the chain.
    *   The frontend deserializes this binary data directly from the blockchain node to verify integrity.

### Data Schema
The following structure is serialized and stored on-chain:
```rust
struct DockingReport {
    jobId: String,        // Unique Job Identifier
    moleculeName: String, // Name of the compound
    score: f64,          // Docking Score (kcal/mol)
    timestamp: u64        // Unix Timestamp of verification
}
```

### Wallet Requirements
To interact with the verification features, you must:
1.  Install the **Phantom Wallet** browser extension.
2.  Switch your wallet network to **Devnet**.
3.  Obtain free Devnet SOL (Solana Faucet) to pay for transaction gas fees (usually < 0.00001 SOL).

## Technology Stack

### Frontend
*   **React 19**: Leveraging concurrent rendering.
*   **TypeScript**: Strict type safety for scientific data.
*   **Tailwind CSS**: Scientific/Dark mode aesthetic.
*   **Vite**: Build tooling.

### AI & Data
*   **Google GenAI SDK**: 
    *   `gemini-3-pro-preview`: Complex reasoning for reports.
    *   `gemini-3-flash-preview`: Low latency for interactive chat.
*   **Recharts**: SVG-based data visualization.
*   **jsPDF / html2canvas**: Report generation.

### Blockchain
*   **@solana/web3.js**: Interaction with Solana nodes.
*   **Borsh**: Binary serialization for on-chain data storage.

## Getting Started

1.  **Clone the repository**
2.  **Install dependencies**: 
    ```bash
    npm install
    ```
3.  **Configure Environment**: 
    Create a `.env` file in the root directory and add your Google Gemini API Key:
    ```env
    API_KEY=your_google_api_key_here
    ```
4.  **Run Development Server**: 
    ```bash
    npm run dev
    ```
5.  **Open in Browser**: Navigate to `http://localhost:5173`.

## Usage Guide

1.  **Upload**: Drag and drop a `.pdbqt`, `.sdf`, or `.out` file. The system will auto-parse metrics like Docking Score and Molecular Weight.
2.  **Analyze**: View the generated charts and 3D visualization. Wait for the Gemini Agent to generate the textual summary.
3.  **Chat**: Switch to the "Ask AI" tab to discuss specific binding modes or optimization strategies with the agent.
4.  **Connect Wallet**: Click "Connect Phantom" (ensure you are on Devnet).
5.  **Verify**: Click "Verify" to sign a transaction. Once confirmed, a green checkmark and Transaction Hash will appear.
6.  **Audit**: Go to the "Audit" tab to fetch the data live from the Solana blockchain and compare it against the local app data to ensure integrity.
7.  **Export**: Click "Export PDF" to download the full report.
