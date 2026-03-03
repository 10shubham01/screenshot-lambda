# Screenshot Lambda

AWS Lambda function (Node.js + TypeScript) that takes a URL, captures a screenshot with a configurable viewport, and returns the image directly. Designed for **Lambda Function URL** as a REST-style POST API with **x-api-key** authentication.

## REST API (Function URL)

- **Endpoint:** Your Lambda Function URL (e.g. `https://abc123.lambda-url.us-east-1.on.aws/`)
- **Auth:** Required header `x-api-key` (value must match the `API_KEY` or `SCREENSHOT_API_KEY` env var).
- **Methods:** `POST` (JSON body), `GET` (query params), `OPTIONS` (CORS preflight).

### Authentication

Set one of these environment variables on the Lambda:

- `API_KEY` – expected value for the `x-api-key` header
- `SCREENSHOT_API_KEY` – alternative (checked if `API_KEY` is not set)

Missing or invalid `x-api-key` returns **401 Unauthorized**.

### Viewport options

| View     | Resolution   | Use case        |
|----------|--------------|-----------------|
| `mobile` | 390×844      | Phone (2x scale)|
| `tablet` | 768×1024     | Tablet (2x scale)|
| `desktop`| 1920×1080    | Desktop         |

### Request

**POST (recommended) – JSON body:**

- `url` (required) – Page URL (must start with `http` or `https`)
- `view` – `"mobile"` \| `"desktop"` \| `"tablet"` (default: `desktop`)
- `fullPage` – `true` to capture full scrollable page (default: `false`)
- `quality` – 1–100 for jpeg/webp (default: `90`)
- `type` – `"png"` \| `"jpeg"` \| `"webp"` (default: `"png"`)

**Example:**

```bash
curl -X POST "https://YOUR-FUNCTION-URL/" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_SECRET_KEY" \
  -d '{"url":"https://example.com","view":"mobile","type":"jpeg","quality":85}'
```

**GET** – same options as query params (e.g. `?url=https://example.com&view=desktop`). Auth still via `x-api-key`.

## Response

| Status | Meaning |
|--------|--------|
| **200** | Success – response body is the image (base64-encoded when using Lambda). Decode to get bytes. |
| **400** | Bad Request – invalid or missing `url`, or invalid JSON body. |
| **401** | Unauthorized – missing or invalid `x-api-key`. |
| **405** | Method Not Allowed – use POST or GET. |
| **500** | Internal Server Error – browser/screenshot failure or missing `API_KEY` config. |

All error responses are JSON: `{"error":"...", "message":"..."}`.

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

### Environment

- **`API_KEY`** or **`SCREENSHOT_API_KEY`** (required) – secret for `x-api-key` header. If neither is set, all requests return 500.
- `AWS_LAMBDA_FUNCTION_MEMORY_SIZE` – used by Chromium; 2048 is a good default.

## Local development

For local runs you need a Chromium binary. Use full Puppeteer for local testing:

```bash
npm install puppeteer --save-dev
```

Then temporarily use `puppeteer` (not `puppeteer-core`) and omit `executablePath` when not in Lambda (e.g. when `process.env.AWS_LAMBDA_FUNCTION_NAME` is undefined).
