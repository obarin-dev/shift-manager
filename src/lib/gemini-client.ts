import { GoogleGenerativeAI, SchemaType, type ResponseSchema } from "@google/generative-ai";

const DEFAULT_MODEL = "gemini-2.0-flash-lite";

export function getGeminiApiKey() {
  return process.env.GEMINI_API_KEY?.trim() ?? "";
}

export function getGeminiModelName() {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
}

export function isGeminiConfigured() {
  return Boolean(getGeminiApiKey());
}

const shiftAssignmentSchema: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    assignments: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          staff_id: { type: SchemaType.STRING },
          work_date: { type: SchemaType.STRING },
          shift_type: { type: SchemaType.STRING },
        },
        required: ["staff_id", "work_date", "shift_type"],
      },
    },
    notes: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    },
  },
  required: ["assignments"],
};

export type GeminiShiftAssignmentResponse = {
  assignments: Array<{
    staff_id: string;
    work_date: string;
    shift_type: string;
  }>;
  notes?: string[];
};

export async function generateShiftAssignmentsJson(prompt: string): Promise<GeminiShiftAssignmentResponse> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error("gemini_not_configured");
  }

  const client = new GoogleGenerativeAI(apiKey);
  const model = client.getGenerativeModel({
    model: getGeminiModelName(),
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: shiftAssignmentSchema,
      temperature: 0.4,
    },
  });

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  if (!text) {
    throw new Error("gemini_empty_response");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("gemini_invalid_json");
  }

  if (!parsed || typeof parsed !== "object" || !Array.isArray((parsed as GeminiShiftAssignmentResponse).assignments)) {
    throw new Error("gemini_invalid_shape");
  }

  return parsed as GeminiShiftAssignmentResponse;
}
