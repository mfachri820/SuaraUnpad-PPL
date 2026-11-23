import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getS3Client, getStorageConfig, signedUrlForKey } from "@/lib/storage";

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

// Service AI deteksi kerusakan (sekarang HF Space; nanti bisa service FastAPI di cluster kampus).
//   AI_ENDPOINT     URL endpoint predict. Kosong = pakai HF Space default.
//   AI_INPUT_MODE   "url"  -> kirim JSON { image_url, type }, image_url = temporary URL 10 menit
//                   "file" -> kirim multipart (file + type); AI tidak perlu akses MinIO/internet
//   AI_TIMEOUT_MS   batas waktu panggilan AI (default 20000)
// Bucket tetap privat di kedua mode: yang membuat temporary URL / mengambil file adalah app ini.
const DEFAULT_AI_ENDPOINT = "https://unagisupreme-ai-objectdamagedetection.hf.space/predict";
const AI_URL_TTL_SECONDS = 10 * 60;

function aiConfig() {
  const timeout = Number(process.env.AI_TIMEOUT_MS);
  return {
    endpoint: process.env.AI_ENDPOINT?.trim() || DEFAULT_AI_ENDPOINT,
    mode: process.env.AI_INPUT_MODE?.trim().toLowerCase() === "file" ? "file" : "url",
    timeoutMs: Number.isFinite(timeout) && timeout > 0 ? timeout : 20_000
  } as const;
}

async function readObject(key: string) {
  const config = getStorageConfig();
  const object = await getS3Client().send(new GetObjectCommand({ Bucket: config.bucket, Key: key }));
  if (!object.Body) throw new Error("Gambar tidak ditemukan di storage.");
  return {
    bytes: Buffer.from(await object.Body.transformToByteArray()),
    contentType: object.ContentType || "application/octet-stream"
  };
}

/** imageKey = object key hasil /api/uploads. */
export async function detectDamage(imageKey: string, type: AiDamageType) {
  const normalizedType = type.toLowerCase() as AiDamageType;
  const { endpoint, mode, timeoutMs } = aiConfig();

  let init: RequestInit;
  if (mode === "file") {
    const { bytes, contentType } = await readObject(imageKey);
    const form = new FormData();
    const fileName = imageKey.split("/").pop() || "image";
    form.append("file", new Blob([new Uint8Array(bytes)], { type: contentType }), fileName);
    form.append("type", normalizedType);
    init = { method: "POST", body: form };
  } else {
    const imageUrl = await signedUrlForKey(imageKey, { ttlSeconds: AI_URL_TTL_SECONDS, roundToHour: false });
    init = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_url: imageUrl, type: normalizedType })
    };
  }

  let res: Response;
  try {
    res = await fetch(endpoint, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  } catch (error) {
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
      throw new Error("Layanan AI tidak merespons. Coba lagi beberapa saat lagi.");
    }
    throw error;
  }

  if (!res.ok) {
    const errorText = await res.text();
    const detail = errorText ? `: ${errorText.slice(0, 300)}` : "";
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
