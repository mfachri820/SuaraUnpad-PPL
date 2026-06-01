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
    body: JSON.stringify({ image_url: imageUrl, type: normalizedType })
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
