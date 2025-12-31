import { 
  Connection, 
  PublicKey, 
  Transaction, 
  SystemProgram, 
  clusterApiUrl,
  TransactionInstruction
} from "@solana/web3.js";
import { serialize, deserialize } from "borsh";

// ------------------------------------------------------------------
// ON-CHAIN PROGRAM CONFIGURATION
// ------------------------------------------------------------------

// We use the Memo Program to store data on-chain. 
// This allows us to attach arbitrary binary data to a transaction.
const BIOCHAIN_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcQb"); 

// ------------------------------------------------------------------
// DATA SCHEMA (ANCHOR STYLE)
// ------------------------------------------------------------------

/**
 * Maps to a Rust struct:
 * 
 * #[account]
 * public struct DockingReport {
 *     pub job_id: String,
 *     pub molecule_name: String,
 *     pub score: f64,
 *     pub timestamp: i64,
 * }
 */
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

const DockingReportBorsh = new Map([
  [
    DockingReportSchema,
    {
      kind: 'struct',
      fields: [
        ['jobId', 'string'],
        ['moleculeName', 'string'],
        ['score', 'f64'], 
        ['timestamp', 'u64'],
      ],
    },
  ],
]);

// ------------------------------------------------------------------
// WALLET PROVIDER INTERFACE
// ------------------------------------------------------------------

interface SolanaProvider {
  isPhantom?: boolean;
  connect: (opts?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: PublicKey }>;
  disconnect: () => Promise<void>;
  signAndSendTransaction: (transaction: Transaction) => Promise<{ signature: string }>;
  publicKey: PublicKey | null;
}

const getProvider = (): SolanaProvider | null => {
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
  const provider = getProvider();
  if (!provider) {
    window.open("https://phantom.app/", "_blank");
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
 * 
 * Constructs a binary payload using Borsh serialization and writes it to the Solana Ledger
 * using the Memo program.
 */
export const verifyJobOnChain = async (jobId: string, moleculeName: string, score: number): Promise<string> => {
  const provider = getProvider();
  if (!provider || !provider.publicKey) {
    throw new Error("Wallet not connected");
  }

  const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');

  // 1. Prepare the Payload Data
  const reportData = new DockingReportSchema({
    jobId: jobId,
    moleculeName: moleculeName,
    score: score,
    timestamp: Date.now()
  });

  // 2. Serialize to Binary (Borsh)
  const serializedData = serialize(DockingReportBorsh, reportData);
  
  // Note: We use the Uint8Array directly as Buffer is not available in browser environment without polyfill
  const instructionData = serializedData;

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
 * 
 * Reads a transaction by its signature, extracts the Memo data,
 * and deserializes it to prove the data exists on-chain.
 */
export const fetchJobFromChain = async (signature: string): Promise<DockingReportSchema | null> => {
  const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');

  try {
    // 1. Fetch the parsed transaction
    const tx = await connection.getTransaction(signature, {
      maxSupportedTransactionVersion: 0,
      commitment: "confirmed"
    });

    if (!tx || !tx.transaction || !tx.transaction.message) {
      throw new Error("Transaction not found or incomplete");
    }

    // 2. Find the instruction targeting the Memo Program
    // In compiled instructions, we look for the programIndex that matches our Memo ID
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

    // 3. Extract the binary data (Borsh)
    // The data is stored as a Uint8Array in the instruction
    const dataBuffer = memoInstruction.data;

    // 4. Deserialize
    // We must deserialize it into the DockingReportSchema class
    const decoded: DockingReportSchema = deserialize(
      DockingReportBorsh, 
      DockingReportSchema, 
      dataBuffer
    );

    return decoded;

  } catch (err) {
    console.error("Failed to fetch on-chain data:", err);
    return null;
  }
};
