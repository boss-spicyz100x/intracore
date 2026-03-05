import { test, expect } from "bun:test";
import { validateGitHubToken } from "./github";

test("validateGitHubToken resolves to email when token is valid", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : (input as Request).url;
    if (url.includes("api.github.com/user") && !url.includes("/emails")) {
      return new Response(JSON.stringify({ email: "test@example.com" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (url.includes("api.github.com/user/emails")) {
      return new Response(JSON.stringify([{ email: "test@example.com", primary: true }]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    return originalFetch(input as RequestInfo);
  }) as typeof fetch;

  try {
    const result = await validateGitHubToken("valid-token");
    expect(result).toEqual({ email: "test@example.com" });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("validateGitHubToken resolves to null when token is invalid", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : (input as Request).url;
    if (url.includes("api.github.com")) {
      return new Response("Unauthorized", { status: 401 });
    }
    return originalFetch(input as RequestInfo);
  }) as typeof fetch;

  try {
    const result = await validateGitHubToken("invalid");
    expect(result).toBeNull();
  } finally {
    globalThis.fetch = originalFetch;
  }
});
