import { 
  Connection, 
  PublicKey, 
  Transaction, 
  SystemProgram, 
  clusterApiUrl,
  TransactionInstruction,
  Cluster
} from "@solana/web3.js";

// ------------------------------------------------------------------
// CONFIGURATION - SINGLE SOURCE OF TRUTH
// ------------------------------------------------------------------

export const SOLANA_NETWORK: Cluster = 'devnet';

// We use the Memo Program to store data on-chain. 
const BIOCHAIN_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcQb"); 

// ------------------------------------------------------------------
// DATA SCHEMA
// ------------------------------------------------------------------

export class DockingReportSchema {
  jobId: string = "";
  moleculeName: string = "";
  score: number = 0;
  timestamp: number = 0;

  constructor(fields?: { jobId: string; moleculeName: string; score: number; timestamp: number }) {
    if (fields) {
      this.jobId = fields.jobId;
      this.moleculeName = fields.moleculeName;
      this.score = fields.score;
      this.timestamp = fields.timestamp;
    }
  }
}

// ------------------------------------------------------------------
// SERIALIZATION (JSON for Safety)
// ------------------------------------------------------------------
// Note: We use JSON stringification because Phantom and other wallets
// try to decode Memo instruction data as UTF-8 text to display it.
// Sending raw binary data often causes wallet extension crashes.

function serializeDockingReport(data: DockingReportSchema): Uint8Array {
    const jsonString = JSON.stringify(data);
    return new TextEncoder().encode(jsonString);
}

function deserializeDockingReport(data: Uint8Array | Buffer | number[]): DockingReportSchema {
    let bytes: Uint8Array;
    
    if (data instanceof Uint8Array) {
        bytes = data;
    } else if (Array.isArray(data)) {
        bytes = new Uint8Array(data);
    } else {
        // Assume Buffer or similar
        bytes = new Uint8Array(data);
    }

    const text = new TextDecoder().decode(bytes);
    try {
        const json = JSON.parse(text);
        return new DockingReportSchema(json);
    } catch (e) {
        console.warn("Failed to parse on-chain data as JSON, falling back or returning empty", e);
        return new DockingReportSchema();
    }
}

// Helper to safely get Buffer from global scope (polyfilled in index.html)
const getBuffer = () => {
  // @ts-ignore
  if (typeof window !== 'undefined' && window.Buffer) return window.Buffer;
  // @ts-ignore
  if (typeof global !== 'undefined' && global.Buffer) return global.Buffer;
  return null;
};

// ------------------------------------------------------------------
// WALLET PROVIDER INTERFACE
// ------------------------------------------------------------------

interface SolanaProvider {
  isPhantom?: boolean;
  connect: (opts?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: PublicKey }>;
  disconnect: () => Promise<void>;
  signAndSendTransaction: (transaction: Transaction) => Promise<{ signature: string }>;
  publicKey: PublicKey | null;
  on?: (event: string, callback: (args: any) => void) => void;
}

const getProvider = (): SolanaProvider | null => {
  if ('phantom' in window) {
    const provider = (window as any).phantom?.solana;
    if (provider?.isPhantom) {
      return provider;
    }
  }
  if ('solana' in window) {
    const provider = (window as any).solana;
    if (provider.isPhantom) {
        return provider;
    }
  }
  return null;
};

// ------------------------------------------------------------------
// SERVICE FUNCTIONS
// ------------------------------------------------------------------

export const connectWallet = async (): Promise<string | null> => {
  let provider = getProvider();
  
  // Retry mechanism for provider injection
  if (!provider) {
      for (let i = 0; i < 10; i++) {
        await new Promise(resolve => setTimeout(resolve, 100));
        provider = getProvider();
        if (provider) break;
      }
  }
  
  if (!provider) {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
        const currentUrl = encodeURIComponent(window.location.href);
        const ref = encodeURIComponent(window.location.origin);
        const deepLink = `https://phantom.app/ul/browse/${currentUrl}?ref=${ref}`;
        if (confirm("Phantom wallet not detected. Open in Phantom App?")) {
            window.location.href = deepLink;
        }
        return null;
    }
    alert("Phantom wallet not found. Please ensure the extension is installed.");
    return null;
  }

  try {
    const resp = await provider.connect();
    return resp.publicKey.toString();
  } catch (err) {
    console.error("User rejected request", err);
    return null;
  }
};

export const disconnectWallet = async (): Promise<void> => {
  const provider = getProvider();
  if (provider) {
    await provider.disconnect();
  }
};

export const checkWalletConnection = async (): Promise<string | null> => {
  const provider = getProvider();
  if (provider && provider.publicKey) {
    return provider.publicKey.toString();
  }
  if (provider) {
      try {
          const resp = await provider.connect({ onlyIfTrusted: true });
          return resp.publicKey.toString();
      } catch {
          return null;
      }
  }
  return null;
};

/**
 * Verify Job on Solana Blockchain
 */
export const verifyJobOnChain = async (jobId: string, moleculeName: string, score: number): Promise<string> => {
  const provider = getProvider();
  if (!provider || !provider.publicKey) {
    throw new Error("Wallet not connected");
  }

  // Ensure we are connecting to the configured network
  const connection = new Connection(clusterApiUrl(SOLANA_NETWORK), 'confirmed');

  // 1. Prepare Data
  const reportData = new DockingReportSchema({
    jobId: jobId,
    moleculeName: moleculeName,
    score: score,
    timestamp: Date.now()
  });

  // 2. Serialize to JSON Bytes
  const instructionData = serializeDockingReport(reportData);
  
  // Convert to Buffer if possible (Better compatibility with web3.js/Phantom)
  const BufferPolyfill = getBuffer();
  const finalData = BufferPolyfill ? BufferPolyfill.from(instructionData) : instructionData;

  // 3. Construct the Transaction Instruction
  const transaction = new Transaction();
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = provider.publicKey;

  transaction.add(
    new TransactionInstruction({
      keys: [
        { pubkey: provider.publicKey, isSigner: true, isWritable: true }
      ],
      programId: BIOCHAIN_PROGRAM_ID,
      data: finalData as Buffer, 
    })
  );

  try {
    const { signature } = await provider.signAndSendTransaction(transaction);
    await connection.confirmTransaction(signature, 'processed');
    return signature;
  } catch (err) {
    console.error("Transaction failed", err);
    throw new Error(`Transaction failed. Please ensure your Phantom wallet is set to '${SOLANA_NETWORK}' and you have SOL.`);
  }
};

/**
 * Fetch and Verify Job from Solana Blockchain
 */
export const fetchJobFromChain = async (signature: string): Promise<DockingReportSchema | null> => {
  const connection = new Connection(clusterApiUrl(SOLANA_NETWORK), 'confirmed');

  try {
    const tx = await connection.getTransaction(signature, {
      maxSupportedTransactionVersion: 0,
      commitment: "confirmed"
    });

    if (!tx || !tx.transaction || !tx.transaction.message) {
      throw new Error("Transaction not found or incomplete");
    }

    const instructions = tx.transaction.message.compiledInstructions;
    const accountKeys = tx.transaction.message.staticAccountKeys;
    
    let memoInstruction = null;

    for (const ix of instructions) {
       const programId = accountKeys[ix.programIdIndex];
       if (programId.toString() === BIOCHAIN_PROGRAM_ID.toString()) {
         memoInstruction = ix;
         break;
       }
    }

    if (!memoInstruction) {
      throw new Error("No BioChain Memo instruction found in this transaction");
    }

    // 3. Extract and Deserialize
    const dataBuffer = memoInstruction.data; 
    const decoded = deserializeDockingReport(dataBuffer);

    return decoded;

  } catch (err) {
    console.error("Failed to fetch on-chain data:", err);
    return null;
  }
};