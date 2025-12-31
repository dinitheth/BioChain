# BioChain Docking Agent

## Overview

BioChain Docking Agent is an advanced, AI-powered decentralized application (dApp) designed to streamline the analysis and verification of molecular docking simulations. It bridges the gap between computational chemistry and blockchain technology by providing a platform where researchers can upload docking results, receive instant AI-generated insights, visualize molecular structures, and immutably verify their findings on the Solana blockchain.

This platform addresses the need for transparency, reproducibility, and rapid analysis in the drug discovery pipeline.

## What It Does

BioChain serves as an intelligent interface for computational biologists and chemists. Its core functions include:

1.  **Job Management**: A centralized dashboard to track status, scores, and metadata of multiple docking experiments.
2.  **AI-Driven Analysis**: Utilizes Google's Gemini models to generate executive summaries, interpreting complex metrics like docking scores, binding efficiency, and hydrogen bond interactions into natural language insights.
3.  **Advanced Visualization**: Provides interactive 3D molecular structure views with 2-axis rotation, pan/zoom controls, hydrogen bond visualization, and snapshot export capabilities.
4.  **On-Chain Verification**: Allows users to "sign" and record their scientific results on the Solana blockchain, creating a permanent, tamper-proof record (Proof of Computation) for intellectual property and audit trails.
5.  **Professional Reporting**: Generates comprehensive PDF reports that include high-resolution snapshots of visualisations and the AI-generated analysis.

## Why Use BioChain?

### 1. Accelerated Insight
Traditional docking logs are dense and technical. BioChain's AI agent parses these statistics immediately to highlight high-potential drug candidates, drastically reducing the time spent on manual data interpretation.

### 2. Immutable Audit Trails
In scientific research, data integrity is paramount. By anchoring results to the Solana blockchain, BioChain ensures that a specific set of results existed at a specific point in time, protecting against data manipulation and supporting patent claims.

### 3. Unified Workflow
Instead of switching between a molecular viewer, a graphing tool, and a notebook, BioChain aggregates visualization, analysis, and reporting into a single, modern web interface.

## Use Cases

*   **Academic Research**: Graduate students and professors can organize screening batches and generate quick reports for grant updates or papers.
*   **Pharmaceutical R&D**: Early-stage drug discovery teams can use the platform to filter libraries of compounds and verify the integrity of their screening data before passing candidates to wet labs.
*   **Decentralized Science (DeSci)**: Independent researchers can publish their findings on-chain to prove priority of discovery without needing immediate publication in traditional journals.

## Technology Stack

BioChain is built using a modern, performance-oriented stack:

### Frontend
*   **React 19**: Leveraging the latest features for concurrent rendering and state management.
*   **TypeScript**: Ensuring type safety and code maintainability across the application.
*   **Tailwind CSS**: For a responsive, design-system-driven user interface with a dark, scientific aesthetic.

### AI & Data
*   **Google GenAI SDK**: Integration with Gemini 2.5/3 series models for generating context-aware scientific summaries.
*   **Recharts**: For rendering responsive, SVG-based data visualizations.

### Utilities
*   **jsPDF & html2canvas**: For generating high-fidelity PDF reports with embedded canvas elements.
*   **Vite**: Fast tooling and bundling.

### Blockchain (Simulation)
*   **Solana**: Designed for high-speed, low-cost transactions suitable for frequent scientific data anchoring.

## Functional Requirements

1.  **File Upload**: Users must be able to upload molecular data files (.pdbqt, .sdf, .out) via a drag-and-drop interface.
2.  **Dashboard View**: The system must display a searchable and filterable list of all jobs with key metrics (Docking Score, Status).
3.  **Visualization**:
    *   The system must render a 3D representation of the molecule with full mouse interaction (rotate X/Y, pan, zoom).
    *   Users can toggle visual aids like Hydrogen Bonds and background modes.
    *   Users can export the current molecular view as a high-quality PNG.
4.  **AI Analysis**: The system must query an LLM with specific docking parameters and display the generated textual analysis.
5.  **Wallet Integration**: Users must be able to connect a crypto wallet.
6.  **Verification**: Authenticated users must be able to trigger a transaction that links a Job ID to a blockchain transaction hash.
7.  **Export**: Users must be able to download a PDF containing the molecule image, charts, stats, and AI summary.

## Non-Functional Requirements

1.  **Responsiveness**: The UI must adapt seamlessly between desktop monitors and mobile devices (using card views for mobile tables).
2.  **Performance**: Visualizations and charts must render without blocking the main thread; PDF generation should handle heavy canvas operations asynchronously.
3.  **Aesthetics**: The design must reflect a "Sci-Fi/Professional" theme using a dark palette (slate/science-blue) to reduce eye strain during long analysis sessions.
4.  **Security**: API keys for AI services must be handled securely (typically via environment variables in production).

## Getting Started

1.  **Clone the repository**
2.  **Install dependencies**: `npm install`
3.  **Configure Environment**: Create a `.env` file and add your `API_KEY` for Google GenAI.
4.  **Run Development Server**: `npm run dev`
5.  **Build for Production**: `npm run build`
