import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import multipart from "@fastify/multipart";
import { randomUUID } from "node:crypto";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const uploadRoutes: PluginType = async (app) => {
  await app.register(multipart, {
    limits: {
      files: 1,
      fileSize: MAX_FILE_SIZE,
    },
  });

  let r2Client: S3Client | undefined;

  app.post(
    "/",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const accountId = process.env.R2_ACCOUNT_ID;
      const accessKeyId = process.env.R2_ACCESS_KEY_ID;
      const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
      const bucketName = process.env.R2_BUCKET_NAME;

      if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
        throw app.httpErrors.serviceUnavailable(
          "R2 storage is not configured"
        );
      }

      const file = await request.file();
      if (!file) {
        throw app.httpErrors.badRequest("A file is required");
      }

      r2Client ??= new S3Client({
        region: "auto",
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId, secretAccessKey },
      });

      const body = await file.toBuffer();
      const key = `uploads/${randomUUID()}`;

      await r2Client.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: key,
          Body: body,
          ContentType: file.mimetype,
        })
      );

      const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL?.replace(/\/+$/, "");
      const url = publicBaseUrl ? `${publicBaseUrl}/${key}` : null;

      return reply.status(201).send({
        status: "success",
        data: {
          key,
          url,
          contentType: file.mimetype,
          size: body.byteLength,
        },
      });
    }
  );
};

export default uploadRoutes;
