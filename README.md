# Screenshot Lambda

AWS Lambda function (Node.js + TypeScript) that takes a URL, captures a screenshot with a configurable viewport, and returns the image directly.

## Viewport options

| View     | Resolution   | Use case        |
|----------|--------------|-----------------|
| `mobile` | 390×844      | Phone (2x scale)|
| `tablet` | 768×1024     | Tablet (2x scale)|
| `desktop`| 1920×1080    | Desktop         |

## Request

**Body (JSON) or query params:**

- `url` (required) – Page URL (must start with `http` or `https`)
- `view` – `"mobile"` \| `"desktop"` \| `"tablet"` (default: `desktop`)
- `fullPage` – `true` to capture full scrollable page (default: `false`)
- `quality` – 1–100 for jpeg/webp (default: `90`)
- `type` – `"png"` \| `"jpeg"` \| `"webp"` (default: `"png"`)

**Example (API Gateway):**

```json
POST /
{
  "url": "https://example.com",
  "view": "mobile",
  "fullPage": true,
  "type": "jpeg",
  "quality": 85
}
```

**Example (query string):**

```
GET /?url=https://example.com&view=desktop&type=png
```

## Response

- **Success (200):** Binary image in response body with `Content-Type` and `isBase64Encoded: true`. Decode the body from base64 to get the image bytes.
- **Error (4xx/5xx):** JSON body with `error` and optional `message`.

**Note:** Lambda sync response payload is limited to 6 MB. For large screenshots, use jpeg/webp and lower quality or resolution, or upload the image to S3 and return a URL instead.

## Setup

### Dependencies

Uses `puppeteer-core` and `@sparticuz/chromium` so Chromium runs inside Lambda (no external screenshot API).

### Build and package

```bash
npm install
npm run build
```

For deployment, create a zip that includes:

1. `dist/` (compiled JS)
2. `node_modules/`
3. Chromium layer: add the [Chromium layer for Lambda](https://github.com/Sparticuz/chromium/releases) (e.g. `chromium-v131.0.2-layer.zip`) to your function, or bundle Chromium in the deployment package.

### Lambda configuration

- **Runtime:** Node.js 18+ or 20
- **Memory:** 1024 MB or more (recommended 2048 MB for faster screenshots)
- **Timeout:** 30–60 seconds
- **Layer:** Attach `@sparticuz/chromium` Lambda layer for your region, or include Chromium in the package and set `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=1` and point `executablePath` to the layer path.

### Environment (optional)

- `AWS_LAMBDA_FUNCTION_MEMORY_SIZE` – used by Chromium; 2048 is a good default.

## Local development

For local runs you need a Chromium binary. Use full Puppeteer for local testing:

```bash
npm install puppeteer --save-dev
```

Then temporarily use `puppeteer` (not `puppeteer-core`) and omit `executablePath` when not in Lambda (e.g. when `process.env.AWS_LAMBDA_FUNCTION_NAME` is undefined).
# screenshot-lambda
