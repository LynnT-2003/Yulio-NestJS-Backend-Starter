import { IAuthResponse } from '../../common/interfaces/auth.interface';

/**
 * Builds a redirect URL for first-party SPAs: tokens live in the **fragment** only
 * (not sent to the frontend origin on the initial request).
 *
 * Only used when `FRONTEND_OAUTH_CALLBACK_URL` is set. If unset, the API keeps returning
 * JSON on the OAuth callback route (default template / demo behavior).
 */
export function buildOAuthSpaRedirectUrl(
  frontendCallbackUrl: string,
  auth: IAuthResponse,
): string {
  const base = frontendCallbackUrl.trim().replace(/\/+$/, '');
  const userId = String(auth.user._id);
  const params = new URLSearchParams({
    accessToken: auth.tokens.accessToken,
    refreshToken: auth.tokens.refreshToken,
    userId,
  });
  return `${base}#${params.toString()}`;
}
