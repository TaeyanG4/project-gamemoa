import { z } from "zod";

export const ApiErrorDetailSchema = z.object({
  code: z.string(),
  message: z.string(),
  requestId: z.string().optional(),
});
export type ApiErrorDetail = z.infer<typeof ApiErrorDetailSchema>;

export const ApiErrorResponseSchema = z.object({
  error: ApiErrorDetailSchema,
});
export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;
