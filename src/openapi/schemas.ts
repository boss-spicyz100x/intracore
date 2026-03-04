import { t } from "elysia";

export const errorResponseSchema = t.Object({
  error: t.String(),
  message: t.String(),
});
