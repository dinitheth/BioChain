import { GoogleGenAI, GenerateContentResponse, Chat } from "@google/genai";
import { MoleculeStats } from "../types";

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("API_KEY not found in environment variables. Using mock response.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

// Helper for fallback content when API is down or quota exceeded
const getFallbackReport = (moleculeName: string, stats: MoleculeStats, isQuotaError = false) => {
  const prefix = isQuotaError ? "[Simulated Analysis - API Quota Exceeded]\n" : "[Simulated Analysis]\n";
  return `${prefix}
Analysis for ${moleculeName}:
The docking score of ${stats.dockingScore} kcal/mol indicates a significant binding interaction with the target receptor.
A binding efficiency of ${stats.bindingEfficiency} suggests the molecule utilizes its mass effectively to achieve this affinity.
With a molecular weight of ${stats.molecularWeight} Da, the compound maintains drug-like characteristics suitable for oral bioavailability.
The hydrogen bond donor/acceptor profile (${stats.hBondDonors}/${stats.hBondAcceptors}) supports potential specific polar interactions within the active site.`;
};

export const generateReportFromStats = async (
  moleculeName: string,
  stats: MoleculeStats
): Promise<string> => {
  const ai = getAiClient();
  
  // Fallback if no API key
  if (!ai) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(getFallbackReport(moleculeName, stats));
      }, 1500);
    });
  }

  try {
    const prompt = `
      You are an expert computational chemist and structural biologist.
      Generate a concise but technical executive summary for a molecular docking report.
      
      Compound Name: ${moleculeName}
      Docking Score: ${stats.dockingScore} kcal/mol
      Binding Efficiency: ${stats.bindingEfficiency}
      Molecular Weight: ${stats.molecularWeight} Da
      H-Bond Donors: ${stats.hBondDonors}
      H-Bond Acceptors: ${stats.hBondAcceptors}

      Focus on the therapeutic potential and physical properties. 
      Do not include markdown formatting like ## or **. Keep it raw text or simple paragraphs.
    `;

    // Switched to 'gemini-3-flash-preview' for better efficiency and lower quota usage compared to Pro.
    // Reduced thinkingBudget to 2048 to consume fewer tokens per request.
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        thinkingConfig: {
          thinkingBudget: 2048
        }
      }
    });

    return response.text || "No analysis generated.";
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    
    // Check for Rate Limit / Quota Exceeded errors (429)
    // The SDK might throw different error structures, checking string content/status is safest
    if (
        error.status === 429 || 
        (error.message && error.message.includes('429')) || 
        (error.toString && error.toString().includes('Quota exceeded'))
    ) {
        return getFallbackReport(moleculeName, stats, true);
    }

    return "Error generating AI report. Please check API configuration or quota.";
  }
};

export const createChatSession = (
  moleculeName: string,
  stats: MoleculeStats
): Chat | null => {
  const ai = getAiClient();
  if (!ai) return null;

  return ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: `You are an expert computational chemist.
      Context: Analyzing molecule "${moleculeName}".
      Data: 
      - Docking Score: ${stats.dockingScore} kcal/mol
      - Binding Efficiency: ${stats.bindingEfficiency}
      - MW: ${stats.molecularWeight}
      - H-Donors: ${stats.hBondDonors}
      - H-Acceptors: ${stats.hBondAcceptors}
      
      Answer questions concisely about potential binding modes, chemical properties, or implications of these stats.
      Avoid markdown headers.`
    }
  });
};