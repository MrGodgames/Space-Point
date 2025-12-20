import "dotenv/config";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const {
  YC_ACCESS_KEY_ID,
  YC_SECRET_ACCESS_KEY,
  YC_BUCKET,
  YC_ENDPOINT,
  YC_REGION,
} = process.env;

if (!YC_ACCESS_KEY_ID || !YC_SECRET_ACCESS_KEY || !YC_BUCKET) {
  throw new Error("YC_ACCESS_KEY_ID, YC_SECRET_ACCESS_KEY, YC_BUCKET are required");
}

export const s3Client = new S3Client({
  region: YC_REGION || "ru-central1",
  endpoint: YC_ENDPOINT || "https://storage.yandexcloud.net",
  credentials: {
    accessKeyId: YC_ACCESS_KEY_ID,
    secretAccessKey: YC_SECRET_ACCESS_KEY,
  },
});

export const bucketName = YC_BUCKET;

export const uploadObject = async ({ key, body, contentType }) => {
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: body,
    ContentType: contentType,
  });

  await s3Client.send(command);
};

export const getSignedDownloadUrl = async (key, expiresIn = 3600) => {
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  return getSignedUrl(s3Client, command, { expiresIn });
};

export const deleteObject = async (key) => {
  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  await s3Client.send(command);
};
