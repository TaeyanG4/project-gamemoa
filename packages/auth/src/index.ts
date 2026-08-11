// Auth package - Better Auth integration
// Will be implemented in Phase 3
export const AUTH_ROUTES_PREFIX = "/api/auth";

export interface AuthUser {
  readonly id: string;
  readonly email: string;
  readonly name: string | null;
  readonly image: string | null;
}
