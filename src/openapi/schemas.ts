import { t } from "elysia";

export const errorResponseSchema = t.Object({
  error: t.String(),
  message: t.String(),
});

export const validationErrorSchema = t.Object({
  type: t.Literal("validation"),
  on: t.String(),
  summary: t.String(),
  message: t.Optional(t.String()),
  errors: t.Array(t.Any()),
});

export const identityResponseSchema = t.Object({
  id: t.String({ format: "uuid" }),
  fullName: t.String(),
  email: t.String({ format: "email" }),
  preferredLanguage: t.String(),
});

export const authTokenResponseSchema = t.Object({
  accessToken: t.String(),
  expiresAt: t.String(),
  tokenType: t.Literal("Bearer"),
});

export const whitelistSchema = t.Object({
  id: t.String({ format: "uuid" }),
  email: t.String({ format: "email" }),
  createdAt: t.String(),
});

export const sessionSchema = t.Object({
  id: t.String({ format: "uuid" }),
  email: t.String({ format: "email" }),
  expiresAt: t.String(),
  createdAt: t.String(),
});
