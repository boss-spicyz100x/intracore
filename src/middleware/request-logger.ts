import { Elysia, ElysiaCustomStatusResponse } from "elysia";
import { logger } from "../logger";

const SILENT_PATHS = new Set(["/", "/health"]);

const SENSITIVE_KEYS = new Set([
  "password",
  "token",
  "secret",
  "authorization",
  "apikey",
  "api_key",
]);

function redact(obj: unknown): unknown {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return obj;
  return Object.fromEntries(
    Object.entries(obj as Record<string, unknown>).map(([k, v]) => [
      k,
      SENSITIVE_KEYS.has(k.toLowerCase()) ? "[REDACTED]" : v,
    ]),
  );
}

export const requestLoggerPlugin = new Elysia({ name: "request-logger" })
  .derive({ as: "global" }, () => ({
    requestId: crypto.randomUUID(),
    requestStartTime: performance.now(),
  }))
  .onTransform({ as: "global" }, ({ request, requestId, body, query, set }: any) => {
    set.headers["X-Request-ID"] = requestId;

    const url = new URL(request.url);
    if (SILENT_PATHS.has(url.pathname)) return;

    logger.debug(
      {
        requestId,
        method: request.method,
        path: url.pathname,
        ip: request.headers.get("x-forwarded-for") ?? request.headers.get("cf-connecting-ip"),
        userAgent: request.headers.get("user-agent"),
        query: query && Object.keys(query as object).length ? redact(query) : undefined,
        body: body ? redact(body) : undefined,
      },
      "incoming request",
    );
  })
  .onAfterHandle(
    { as: "global" },
    ({ request, requestId, requestStartTime, set, response }: any) => {
      const url = new URL(request.url);
      if (SILENT_PATHS.has(url.pathname)) return;

      const durationMs = Math.round(performance.now() - requestStartTime);
      const status =
        response instanceof Response
          ? response.status
          : typeof set.status === "number"
            ? set.status
            : 200;

      logger.info(
        {
          requestId,
          method: request.method,
          path: url.pathname,
          status,
          durationMs,
        },
        "request completed",
      );
    },
  )
  .onError({ as: "global" }, (context: any) => {
    const { error, request, set } = context;
    const requestId: string = context.requestId ?? crypto.randomUUID();
    const requestStartTime: number = context.requestStartTime ?? performance.now();

    const url = new URL(request.url);
    const durationMs = Math.round(performance.now() - requestStartTime);

    const isHttpError = error instanceof ElysiaCustomStatusResponse;
    const httpStatus = isHttpError ? error.code : 500;
    const responseBody = isHttpError
      ? error.response
      : { error: "Internal Server Error", message: "An unexpected error occurred" };

    set.status = httpStatus;

    const logPayload = {
      requestId,
      method: request.method,
      path: url.pathname,
      status: httpStatus,
      durationMs,
    };

    if (httpStatus >= 500) {
      logger.error({ ...logPayload, err: error }, "request failed");
    } else {
      logger.warn(logPayload, "request error");
    }

    return responseBody;
  });
