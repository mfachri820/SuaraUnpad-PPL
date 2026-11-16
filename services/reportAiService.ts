export type AiDamageType = "pothole" | "crack" | "korosi" | "sampah";

export interface AiDetection {
  class: string;
  confidence: number;
  bbox: number[];
}

export interface AiDetectionResult {
  status: "success";
  model_used: string;
  runtime_seconds: number;
  has_detection: boolean;
  total_detections: number;
  detections: AiDetection[];
}

export interface AiEvaluation {
  decision: "accept" | "warn" | "reject";
  message: string;
  topConfidence: number | null;
}

const AI_ENDPOINT = "https://unagisupreme-ai-objectdamagedetection.hf.space/predict";

export async function detectDamage(imageUrl: string, type: AiDamageType) {
  const normalizedType = type.toLowerCase() as AiDamageType;
  const res = await fetch(AI_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image_url: imageUrl, type: normalizedType }),
    // Space Hugging Face bisa butuh ~30 detik saat bangun dari sleep.
    signal: AbortSignal.timeout(60000)
  });

  if (!res.ok) {
    const errorText = await res.text();
    const detail = errorText ? `: ${errorText}` : "";
    throw new Error(`AI check failed with status ${res.status}${detail}`);
  }

  return (await res.json()) as AiDetectionResult;
}

export function evaluateAiResult(result: AiDetectionResult): AiEvaluation {
  if (!result.has_detection || result.total_detections === 0) {
    return {
      decision: "reject",
      message: "Tidak ada kerusakan terdeteksi. Silakan foto ulang.",
      topConfidence: null
    };
  }

  const topConfidence = result.detections.reduce((max, det) => {
    return det.confidence > max ? det.confidence : max;
  }, 0);

  if (topConfidence < 0.2) {
    return {
      decision: "reject",
      message: "Hasil deteksi sangat rendah. Silakan foto ulang.",
      topConfidence
    };
  }

  if (topConfidence < 0.6) {
    return {
      decision: "warn",
      message: "Foto kurang jelas. Disarankan foto ulang.",
      topConfidence
    };
  }

  return {
    decision: "accept",
    message: "Foto terdeteksi jelas.",
    topConfidence
  };
}

// ========================================================
// Klasifikasi teks laporan (IndoBERT Labeler)
// ========================================================

export type TextAiLabel = "SAMPAH" | "LUBANG" | "KARATAN" | "RETAKAN";
export type SuggestableCategory = "POTHOLE" | "CRACK" | "CORROSION" | "SAMPAH";

export interface TextAiPrediction {
  labels: string[];
  probabilities: Record<string, number>;
  threshold: number;
}

export interface CategorySuggestionItem {
  category: SuggestableCategory;
  probability: number;
}

export interface CategorySuggestion {
  /** Kategori dengan probabilitas tertinggi di atas threshold, atau null jika tidak ada yang cocok. */
  suggestedCategory: SuggestableCategory | null;
  /** Semua kategori yang lolos threshold, urut dari probabilitas tertinggi. */
  matches: CategorySuggestionItem[];
}

export const TEXT_AI_LABEL_TO_CATEGORY: Record<TextAiLabel, SuggestableCategory> = {
  LUBANG: "POTHOLE",
  RETAKAN: "CRACK",
  KARATAN: "CORROSION",
  SAMPAH: "SAMPAH"
};

export const TEXT_AI_MAX_LENGTH = 20000;
const DEFAULT_TEXT_AI_ENDPOINT = "https://ai-labelling-tool.streamlit.app/~/+/predict";
const DEFAULT_TEXT_AI_TIMEOUT_MS = 15000;

function getTextAiEndpoint() {
  return process.env.REPORT_TEXT_AI_URL?.trim() || DEFAULT_TEXT_AI_ENDPOINT;
}

export async function predictReportLabels(
  text: string,
  options: { threshold?: number; timeoutMs?: number } = {}
): Promise<TextAiPrediction> {
  const res = await fetch(getTextAiEndpoint(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, threshold: options.threshold ?? 0.5 }),
    signal: AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TEXT_AI_TIMEOUT_MS)
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    const detail = errorText ? `: ${errorText}` : "";
    throw new Error(`AI klasifikasi teks gagal dengan status ${res.status}${detail}`);
  }

  const json = (await res.json()) as Partial<TextAiPrediction>;
  if (!Array.isArray(json.labels) || typeof json.probabilities !== "object" || json.probabilities === null) {
    throw new Error("Respons AI klasifikasi teks tidak valid.");
  }

  return {
    labels: json.labels,
    probabilities: json.probabilities,
    threshold: typeof json.threshold === "number" ? json.threshold : options.threshold ?? 0.5
  };
}

export function toCategorySuggestion(prediction: TextAiPrediction): CategorySuggestion {
  const matches = prediction.labels
    .filter((label): label is TextAiLabel => label in TEXT_AI_LABEL_TO_CATEGORY)
    .map((label) => ({
      category: TEXT_AI_LABEL_TO_CATEGORY[label],
      probability: prediction.probabilities[label] ?? 0
    }))
    .sort((a, b) => b.probability - a.probability);

  return {
    suggestedCategory: matches[0]?.category ?? null,
    matches
  };
}

export async function suggestReportCategory(text: string): Promise<CategorySuggestion> {
  return toCategorySuggestion(await predictReportLabels(text));
}

// ========================================================
// Penilaian laporan: teks (IndoBERT) -> kategori -> foto (CV)
// ========================================================

export const CATEGORY_TO_CV_TYPE: Record<SuggestableCategory, AiDamageType> = {
  POTHOLE: "pothole",
  CRACK: "crack",
  CORROSION: "korosi",
  SAMPAH: "sampah"
};

export interface CvCheck {
  category: SuggestableCategory;
  textProbability: number;
  evaluation: AiEvaluation;
}

export type ReportAssessment =
  | {
      decision: "accept" | "warn";
      category: SuggestableCategory | "OTHER";
      /** Hasil CV untuk kategori yang dipakai; null jika CV dilewati (kategori OTHER). */
      evaluation: AiEvaluation | null;
      textLabels: CategorySuggestionItem[];
      cvChecks: CvCheck[];
    }
  | {
      decision: "reject";
      message: string;
      textLabels: CategorySuggestionItem[];
      cvChecks: CvCheck[];
    };

/**
 * Menentukan kategori laporan secara otomatis:
 * 1. Judul diklasifikasi IndoBERT. Tidak ada label (atau AI teks tidak tersedia) -> OTHER, CV dilewati.
 * 2. Setiap label dicek ke model CV sesuai jenisnya (paralel).
 * 3. Kategori = label dengan probabilitas teks tertinggi yang tidak ditolak CV.
 *    Jika semua label ditolak CV -> laporan ditolak.
 * Error dari model CV dilempar ke pemanggil.
 */
export async function assessReport(title: string, imageUrl: string): Promise<ReportAssessment> {
  let textLabels: CategorySuggestionItem[] = [];
  try {
    textLabels = (await suggestReportCategory(title)).matches;
  } catch (error) {
    console.error("Text classification failed, falling back to OTHER:", error);
  }

  if (textLabels.length === 0) {
    return { decision: "accept", category: "OTHER", evaluation: null, textLabels, cvChecks: [] };
  }

  const cvChecks: CvCheck[] = await Promise.all(
    textLabels.map(async (label) => ({
      category: label.category,
      textProbability: label.probability,
      evaluation: evaluateAiResult(await detectDamage(imageUrl, CATEGORY_TO_CV_TYPE[label.category]))
    }))
  );

  const chosen = cvChecks.find((check) => check.evaluation.decision !== "reject");
  if (!chosen) {
    return { decision: "reject", message: cvChecks[0].evaluation.message, textLabels, cvChecks };
  }

  return {
    decision: chosen.evaluation.decision as "accept" | "warn",
    category: chosen.category,
    evaluation: chosen.evaluation,
    textLabels,
    cvChecks
  };
}
