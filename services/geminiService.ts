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

export const generateReportFromStats = async (
  moleculeName: string,
  stats: MoleculeStats
): Promise<string> => {
  const ai = getAiClient();
  
  // Fallback if no API key
  if (!ai) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(`[MOCK REPORT]
Analysis for ${moleculeName}:
The docking score of ${stats.dockingScore} kcal/mol suggests a strong binding affinity. 
With a binding efficiency of ${stats.bindingEfficiency}, this compound is a promising candidate for further lead optimization.
The molecular weight of ${stats.molecularWeight} Da falls within the drug-like range (Lipinski's Rule of 5).
        `);
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

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        thinkingConfig: {
          thinkingBudget: 32768
        }
      }
    });

    return response.text || "No analysis generated.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error generating AI report. Please check API configuration.";
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