// Cek koneksi MinIO + temporary URL dari laptop, memakai kode yang SAMA dengan aplikasi.
//
//   npm run storage:check -- url <object-key>     cetak temporary URL untuk key yang sudah ada
//   npm run storage:check -- upload <file-gambar>  upload ke <STORAGE_ROOT_FOLDER>/general lalu cetak URL-nya
//
// Env dibaca dari .env / shell: AWS_ENDPOINT, AWS_DEFAULT_REGION, AWS_BUCKET, AWS_URL,
// AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, STORAGE_ROOT_FOLDER.
import "dotenv/config";
import { readFileSync } from "node:fs";
import { getStorageConfig, signedUrlForKey } from "@/lib/storage";
import { resolveUploadFolder, uploadService } from "@/services/uploadService";

async function main() {
  const [command, arg] = process.argv.slice(2);
  const config = getStorageConfig();
  console.log(`endpoint : ${config.endpoint}\nbucket   : ${config.bucket}\nAWS_URL  : ${config.publicBaseUrl}\n`);

  if (command === "url" && arg) {
    console.log(await signedUrlForKey(arg));
    return;
  }
  if (command === "upload" && arg) {
    const key = await uploadService.uploadImage(readFileSync(arg), resolveUploadFolder("general"));
    console.log(`key: ${key}\n`);
    console.log(await signedUrlForKey(key));
    return;
  }
  console.error("Pakai: npm run storage:check -- url <object-key> | upload <file-gambar>");
  process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
