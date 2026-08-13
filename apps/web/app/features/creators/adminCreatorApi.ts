import {
  CreatorManualReviewActionRequestSchema,
  CreatorManualReviewActionResponseSchema,
  CreatorManualReviewQueueResponseSchema,
  type CreatorManualReviewActionRequest,
} from "@owogg/contracts";
import { apiFetch } from "../../lib/api/client";

export function fetchManualCreatorReviewsApi(limit = 20, offset = 0) {
  return apiFetch(
    `/api/admin/creators/reviews?limit=${limit}&offset=${offset}`,
    CreatorManualReviewQueueResponseSchema,
  );
}

export function applyManualCreatorReviewApi(
  jobId: number,
  input: CreatorManualReviewActionRequest,
) {
  const parsed = CreatorManualReviewActionRequestSchema.parse(input);
  return apiFetch(
    `/api/admin/creators/reviews/${jobId}/action`,
    CreatorManualReviewActionResponseSchema,
    {
      method: "POST",
      body: JSON.stringify(parsed),
    },
  );
}
