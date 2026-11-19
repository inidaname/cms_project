// Node Fastify implementation of POST /upload — mirrors the Cloudflare
// Worker /upload route contract exactly (see src/helpers/upload.ts).
// Requires exactly one file in the `file` field, enforces the 10 MiB limit
// at both the metadata and streamed-data boundaries, allows only known
// storefront asset types, stores objects under opaque keys, and returns a
// documented 503 when R2 is not configured.
import {
  S3Client,
  PutObjectCommand,
  type S3ClientConfig,
} from "@aws-sdk/client-s3";
import StatusCode from "status-code-enum";
import {
  UPLOAD_MAX_BYTES,
  UPLOAD_MESSAGES,
  buildUploadKey,
  buildUploadUrl,
  isMultipartRequest,
  validateUploadContentType,
} from "../../helpers/upload";

interface R2NodeConfig {
  client: S3Client;
  bucket: string;
  publicBaseUrl?: string;
}

function resolveR2Config(): R2NodeConfig | null {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET_NAME;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    return null;
  }

  const config: S3ClientConfig = {
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  };
  return {
    client: new S3Client(config),
    bucket,
    publicBaseUrl: process.env.R2_PUBLIC_BASE_URL,
  };
}

const uploadRoutes: PluginType = async (app, opts) => {
  // The autoload prefix for this folder is /upload; register at the root.
  app.post(
    "/",
    { preHandler: [app.authenticate] },
    async (request: any, reply: any) => {
      if (!request.tenant) {
        return reply.status(StatusCode.ClientErrorUnauthorized).send({
          status: "error",
          message: "Tenant not found",
        });
      }

      // Contract validation first (runtime-independent), then storage
      // availability: rejections below never depend on R2 configuration.

      if (!isMultipartRequest(request.headers["content-type"])) {
        return reply.status(StatusCode.ClientErrorBadRequest).send({
          status: "error",
          message: UPLOAD_MESSAGES.notMultipart,
        });
      }

      // Metadata boundary: a declared body beyond the limit is rejected
      // before any parsing or object write.
      const declared = Number(request.headers["content-length"] ?? 0);
      if (declared > UPLOAD_MAX_BYTES + 1024) {
        return reply.status(StatusCode.ClientErrorPayloadTooLarge).send({
          status: "error",
          message: UPLOAD_MESSAGES.tooLarge,
        });
      }

      // Streamed-data boundary: count file parts and buffer each file as it
      // is iterated (every part stream must be consumed to advance).
      // @fastify/multipart enforces the per-file size limit while buffering
      // (throwing a 413).
      const parts = request.parts({ limits: { files: 2, fileSize: UPLOAD_MAX_BYTES } });
      let fileCount = 0;
      let fileBuffer: Buffer | null = null;
      let fileMimetype: string | undefined;
      try {
        for await (const part of parts) {
          if (part.type === "file") {
            fileCount++;
            if (fileCount > 1) {
              return reply.status(StatusCode.ClientErrorBadRequest).send({
                status: "error",
                message: UPLOAD_MESSAGES.singleFileRequired,
              });
            }
            fileMimetype = part.mimetype;
            fileBuffer = await part.toBuffer();
          }
        }
      } catch (error: any) {
        if (error?.code === "FST_PART_FILE_TOO_LARGE" || error?.statusCode === 413) {
          return reply.status(StatusCode.ClientErrorPayloadTooLarge).send({
            status: "error",
            message: UPLOAD_MESSAGES.tooLarge,
          });
        }
        return reply.status(StatusCode.ClientErrorBadRequest).send({
          status: "error",
          message: "Invalid multipart form data",
        });
      }

      if (fileCount !== 1 || !fileBuffer) {
        return reply.status(StatusCode.ClientErrorBadRequest).send({
          status: "error",
          message: UPLOAD_MESSAGES.singleFileRequired,
        });
      }

      const buffer = fileBuffer;
      const mimetype = fileMimetype;
      if (buffer.length === 0) {
        return reply.status(StatusCode.ClientErrorBadRequest).send({
          status: "error",
          message: UPLOAD_MESSAGES.emptyFile,
        });
      }
      if (buffer.length > UPLOAD_MAX_BYTES) {
        return reply.status(StatusCode.ClientErrorPayloadTooLarge).send({
          status: "error",
          message: UPLOAD_MESSAGES.tooLarge,
        });
      }

      const typeRejection = validateUploadContentType(mimetype);
      if (typeRejection) {
        return reply.status(StatusCode.ClientErrorUnsupportedMediaType).send({
          status: "error",
          message: typeRejection,
        });
      }

      // Storage availability is checked only once an upload has passed the
      // full validation contract; failures here are the documented 503.
      const r2 = resolveR2Config();
      if (!r2) {
        return reply.status(StatusCode.ServerErrorServiceUnavailable).send({
          status: "error",
          message: UPLOAD_MESSAGES.notConfigured,
        });
      }

      // Opaque server-generated key: the client filename is never used.
      const key = buildUploadKey();

      try {
        await r2.client.send(
          new PutObjectCommand({
            Bucket: r2.bucket,
            Key: key,
            Body: buffer,
            ContentType: mimetype,
          }),
        );
      } catch (error) {
        request.log.error({ err: error }, "R2 upload failed");
        return reply.status(StatusCode.ServerErrorServiceUnavailable).send({
          status: "error",
          message: UPLOAD_MESSAGES.storageUnavailable,
        });
      }

      return reply.status(StatusCode.SuccessCreated).send({
        status: "success",
        data: {
          key,
          url: buildUploadUrl(r2.publicBaseUrl, key),
          contentType: mimetype,
          size: buffer.length,
        },
      });
    },
  );
};

export default uploadRoutes;
