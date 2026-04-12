import { SetMetadata } from '@nestjs/common';

/** Metadata key read by {@link SuspendedUserBlockGuard}. */
export const ALLOW_SUSPENDED_USER_KEY = 'allowSuspendedUser';

/**
 * Opt-in: suspended users may call this route after JWT authentication.
 * All other authenticated routes return **403** with `message: "Account suspended"`.
 *
 * Use for identity/session maintenance only (e.g. profile read, logout), not product actions.
 */
export const AllowSuspendedUser = () => SetMetadata(ALLOW_SUSPENDED_USER_KEY, true);
