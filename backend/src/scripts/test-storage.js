import { randomUUID } from "node:crypto";
import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3, storageBucket } from "../config/storage.js";

const key = `connection-tests/${randomUUID()}.txt`;
const message = "Ilyon Academy Storage Connection Test";

let uploaded = false;

try {
  // Upload file dummy
  await s3.send(
    new PutObjectCommand({
      Bucket: storageBucket,
      Key: key,
      Body: message,
      ContentType: "text/plain",
    }),
  );

  uploaded = true;
  console.log("Upload: OK");

  // Download dan verifikasi isi file
  const result = await s3.send(
    new GetObjectCommand({
      Bucket: storageBucket,
      Key: key,
    }),
  );

  const content = await result.Body.transformToString();

  if (content !== message) {
    throw new Error("Isi file hasil download tidak sesuai.");
  }

  console.log("Download dan verifikasi: OK");

  // Uji pembuatan presigned URL
  await getSignedUrl(
    s3,
    new GetObjectCommand({
      Bucket: storageBucket,
      Key: key,
    }),
    { expiresIn: 60 },
  );

  console.log("Presigned URL: OK");
} catch (error) {
  console.error("Storage test gagal:", error.message);
  process.exitCode = 1;
} finally {
  // Hapus file dummy setelah pengujian
  if (uploaded) {
    try {
      await s3.send(
        new DeleteObjectCommand({
          Bucket: storageBucket,
          Key: key,
        }),
      );

      console.log("Pembersihan file dummy: OK");
    } catch (error) {
      console.error("Gagal menghapus file dummy:", error.message);
      process.exitCode = 1;
    }
  }
}
