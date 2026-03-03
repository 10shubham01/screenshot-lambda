import type { ViewType } from "./viewports";

export interface ScreenshotEvent {
  url: string;
  view?: ViewType;
  fullPage?: boolean;
  quality?: number;
  type?: "png" | "jpeg" | "webp";
}

export interface ScreenshotResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
  isBase64Encoded?: boolean;
}

/** Generic Lambda response (Function URL / HTTP API) */
export type LambdaResponse = ScreenshotResponse;

/** Lambda Function URL / API Gateway HTTP API (payload 2.0) event shape */
export interface FunctionUrlEvent {
  version?: string;
  routeKey?: string;
  rawPath?: string;
  rawQueryString?: string;
  headers?: Record<string, string>;
  queryStringParameters?: Record<string, string> | null;
  requestContext: {
    http?: { method: string };
    httpMethod?: string;
  };
  body?: string | null;
  isBase64Encoded?: boolean;
}
