import { 
  Connection, 
  PublicKey, 
  Transaction, 
  SystemProgram, 
  clusterApiUrl,
  TransactionInstruction
} from "@solana/web3.js";

// Grab Buffer from global scope (injected via index.html)
// This avoids "Module externalized" errors in Vite
declare const window: any;
const Buffer = window.Buffer;

// ------------------------------------------------------------------
// ON-CHAIN PROGRAM CONFIGURATION
// ------------------------------------------------------------------

// We use the Memo Program to store data on-chain. 
// This allows us to attach arbitrary binary data to a transaction.
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
// CUSTOM SERIALIZATION (Replaces Borsh to avoid schema version issues)
// ------------------------------------------------------------------

function serializeDockingReport(data: DockingReportSchema): any {
    const jobIdBytes = Buffer.from(data.jobId, 'utf8');
    const moleculeNameBytes = Buffer.from(data.moleculeName, 'utf8');
    
    // Calculate total size:
    // 4 bytes (u32) for jobId length + jobId bytes
    // 4 bytes (u32) for moleculeName length + moleculeName bytes
    // 8 bytes (f64) for score
    // 8 bytes (u64) for timestamp
    const size = 4 + jobIdBytes.length + 4 + moleculeNameBytes.length + 8 + 8;
    const buffer = Buffer.alloc(size);
    
    let offset = 0;
    
    // 1. Job ID
    buffer.writeUInt32LE(jobIdBytes.length, offset);
    offset += 4;
    jobIdBytes.copy(buffer, offset);
    offset += jobIdBytes.length;
    
    // 2. Molecule Name
    buffer.writeUInt32LE(moleculeNameBytes.length, offset);
    offset += 4;
    moleculeNameBytes.copy(buffer, offset);
    offset += moleculeNameBytes.length;
    
    // 3. Score (f64)
    buffer.writeDoubleLE(data.score, offset);
    offset += 8;
    
    // 4. Timestamp (u64)
    // Convert number to BigInt safely
    buffer.writeBigUInt64LE(BigInt(Math.floor(data.timestamp)), offset);
    offset += 8;
    
    return buffer;
}

function deserializeDockingReport(buffer: any): DockingReportSchema {
    let offset = 0;
    
    // 1. Job ID
    const jobIdLen = buffer.readUInt32LE(offset);
    offset += 4;
    const jobId = buffer.toString('utf8', offset, offset + jobIdLen);
    offset += jobIdLen;
    
    // 2. Molecule Name
    const molNameLen = buffer.readUInt32LE(offset);
    offset += 4;
    const moleculeName = buffer.toString('utf8', offset, offset + molNameLen);
    offset += molNameLen;
    
    // 3. Score
    const score = buffer.readDoubleLE(offset);
    offset += 8;
    
    // 4. Timestamp
    const timestamp = Number(buffer.readBigUInt64LE(offset));
    offset += 8;
    
    return new DockingReportSchema({
        jobId,
        moleculeName,
        score,
        timestamp
    });
}

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

  const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');

  // 1. Prepare Data
  const reportData = new DockingReportSchema({
    jobId: jobId,
    moleculeName: moleculeName,
    score: score,
    timestamp: Date.now()
  });

  // 2. Serialize to Binary (Custom)
  const instructionData = serializeDockingReport(reportData);

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
      data: instructionData,
    })
  );

  try {
    const { signature } = await provider.signAndSendTransaction(transaction);
    await connection.confirmTransaction(signature, 'processed');
    return signature;
  } catch (err) {
    console.error("Transaction failed", err);
    throw new Error("Failed to sign and send on-chain verification.");
  }
};

/**
 * Fetch and Verify Job from Solana Blockchain
 */
export const fetchJobFromChain = async (signature: string): Promise<DockingReportSchema | null> => {
  const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');

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
    const decoded = deserializeDockingReport(Buffer.from(dataBuffer));

    return decoded;

  } catch (err) {
    console.error("Failed to fetch on-chain data:", err);
    return null;
  }
};