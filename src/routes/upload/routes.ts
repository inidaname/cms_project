import { Hono } from "hono";

type Bindings = {
  BUCKET: {
    put(
      key: string,
      value: ReadableStream,
      options: { httpMetadata: { contentType: string } },
    ): Promise<unknown>;
  };
  R2_PUBLIC_BASE_URL?: string;
};

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const app = new Hono<{ Bindings: Bindings }>();

app.post(
  "/uploads",
  /* your auth middleware */ async (c) => {
    const form = await c.req.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return c.json({ status: "error", message: "A file is required" }, 400);
    }
    if (file.size > MAX_FILE_SIZE) {
      return c.json({ status: "error", message: "File too large" }, 413);
    }

    const key = `uploads/${crypto.randomUUID()}`;

    await c.env.BUCKET.put(key, file.stream(), {
      httpMetadata: { contentType: file.type },
    });

    const base = c.env.R2_PUBLIC_BASE_URL?.replace(/\/+$/, "");

    return c.json(
      {
        status: "success",
        data: {
          key,
          url: base ? `${base}/${key}` : null,
          contentType: file.type,
          size: file.size,
        },
      },
      201,
    );
  },
);

export default app;
