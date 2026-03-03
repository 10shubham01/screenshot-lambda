import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import { VIEWPORTS, type ViewType } from "./viewports";
import type { FunctionUrlEvent, ScreenshotEvent, ScreenshotResponse } from "./types";

const DEFAULT_VIEW: ViewType = "desktop";
const DEFAULT_FULL_PAGE = false;
const DEFAULT_QUALITY = 90;
const DEFAULT_TYPE = "png" as const;

const CORS_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, x-api-key",
} as const;

function getMethod(event: FunctionUrlEvent): string {
  return event.requestContext?.http?.method ?? event.requestContext?.httpMethod ?? "";
}

function getHeader(event: FunctionUrlEvent, name: string): string | undefined {
  const headers = event.headers ?? {};
  const lower = name.toLowerCase();
  return headers[lower] ?? headers[name];
}

function jsonResponse(statusCode: number, body: Record<string, unknown>, headers?: Record<string, string>) {
  return {
    statusCode,
    headers: { ...CORS_HEADERS, ...headers },
    body: JSON.stringify(body),
  };
}

function parseBody(event: FunctionUrlEvent): ScreenshotEvent {
  let body: Record<string, unknown> = {};
  let raw = event.body;
  if (raw) {
    if (event.isBase64Encoded) {
      try {
        raw = Buffer.from(raw, "base64").toString("utf-8");
      } catch {
        raw = "";
      }
    }
    try {
      body = typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch {
      body = {};
    }
  }
  const query = event.queryStringParameters ?? {};
  const fullPage =
    body.fullPage === true || (typeof query.fullPage === "string" && query.fullPage === "true");
  return {
    url: (body.url ?? query.url ?? "") as string,
    view: (body.view ?? query.view ?? DEFAULT_VIEW) as ViewType,
    fullPage,
    quality: (body.quality ?? (query.quality ? Number(query.quality) : DEFAULT_QUALITY)) as number,
    type: (body.type ?? query.type ?? DEFAULT_TYPE) as "png" | "jpeg" | "webp",
  };
}

function getContentType(type: "png" | "jpeg" | "webp"): string {
  const map: Record<string, string> = {
    png: "image/png",
    jpeg: "image/jpeg",
    webp: "image/webp",
  };
  return map[type] ?? "image/png";
}

export async function handler(event: FunctionUrlEvent): Promise<ScreenshotResponse> {
  const method = getMethod(event);

  if (method === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        ...CORS_HEADERS,
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Access-Control-Max-Age": "86400",
      },
      body: "",
    };
  }

  if (method !== "POST" && method !== "GET") {
    return jsonResponse(405, { error: "Method Not Allowed", message: "Use POST with JSON body or GET with query params" });
  }

  const apiKey = getHeader(event, "x-api-key");
  const expectedKey = process.env.API_KEY ?? process.env.SCREENSHOT_API_KEY;
  if (!expectedKey) {
    console.error("API_KEY or SCREENSHOT_API_KEY environment variable is not set");
    return jsonResponse(500, { error: "Server configuration error" });
  }
  if (apiKey !== expectedKey) {
    return jsonResponse(401, { error: "Unauthorized", message: "Invalid or missing x-api-key" });
  }

  let input: ScreenshotEvent;
  try {
    input = parseBody(event);
  } catch {
    return jsonResponse(400, { error: "Bad Request", message: "Invalid JSON body" });
  }

  const { url, view = DEFAULT_VIEW, fullPage = DEFAULT_FULL_PAGE, quality = DEFAULT_QUALITY, type = DEFAULT_TYPE } = input;

  if (!url || !url.startsWith("http")) {
    return jsonResponse(400, { error: "Bad Request", message: "Missing or invalid url (must start with http)" });
  }

  const viewType = ["mobile", "desktop", "tablet"].includes(view) ? view : DEFAULT_VIEW;
  const viewport = VIEWPORTS[viewType];

  let browser;
  try {
    const executablePath = await chromium.executablePath();
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: null,
      executablePath,
      headless: true,
    });
  } catch (err) {
    console.error("Browser launch failed:", err);
    return jsonResponse(500, { error: "Internal Server Error", message: "Failed to launch browser" });
  }

  try {
    const page = await browser.newPage();
    await page.setViewport({
      width: viewport.width,
      height: viewport.height,
      deviceScaleFactor: viewport.deviceScaleFactor ?? 1,
      isMobile: viewport.isMobile ?? false,
      hasTouch: viewport.hasTouch ?? false,
      isLandscape: viewport.isLandscape ?? false,
    });

    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    const screenshotQuality = Math.min(100, Math.max(1, quality));
    const options: Parameters<typeof page.screenshot>[0] =
      type === "png"
        ? { type: "png", fullPage }
        : { type, fullPage, quality: screenshotQuality };

    const buffer = await page.screenshot(options);
    await browser.close();

    const base64 = (buffer as Buffer).toString("base64");
    const contentType = getContentType(type);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
        "X-Viewport": viewType,
        "Access-Control-Allow-Origin": "*",
      },
      body: base64,
      isBase64Encoded: true,
    };
  } catch (err) {
    console.error("Screenshot failed:", err);
    if (browser) await browser.close().catch(() => {});
    return jsonResponse(500, {
      error: "Internal Server Error",
      message: err instanceof Error ? err.message : String(err),
    });
  }
}
