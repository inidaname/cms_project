# Getting Started with [Fastify-CLI](https://www.npmjs.com/package/fastify-cli)
This project was bootstrapped with Fastify-CLI.

## Available Scripts

In the project directory, you can run:

### `npm run dev`

To start the app in dev mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

### `npm start`

For production mode

### `npm run test`

Run the test cases.

## File uploads

`POST /upload` accepts one multipart file in the `file` field. The endpoint
requires authentication and limits files to 10 MiB. Uploaded files are stored
in Cloudflare R2 under a generated `uploads/` object key.

For Cloudflare Workers, configure an R2 bucket binding named `UPLOADS`. Set
`R2_PUBLIC_BASE_URL` as a Worker variable if you want the response to include a
public URL for the uploaded object. The route writes directly through the R2
binding and does not require S3 API credentials.

The response includes the object key, content type, size, and the public URL
when configured.

```sh
curl -X POST https://your-api.example.com/upload \
  -H "Authorization: Bearer <access-token>" \
  -F "file=@./image.png"
```

## Learn More

To learn Fastify, check out the [Fastify documentation](https://fastify.dev/docs/latest/).
