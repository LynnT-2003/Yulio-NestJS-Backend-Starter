import { buildOAuthSpaRedirectUrl } from './oauth-spa-redirect.helper';
import { Types } from 'mongoose';

const makeAuth = (overrides: Partial<{ accessToken: string; refreshToken: string; userId: string }> = {}) => ({
  user: { _id: new Types.ObjectId('665a1b2c3d4e5f6a7b8c9d0e') } as any,
  tokens: {
    accessToken: overrides.accessToken ?? 'access123',
    refreshToken: overrides.refreshToken ?? 'refresh456',
  },
});

describe('buildOAuthSpaRedirectUrl', () => {
  it('puts tokens in the fragment', () => {
    const url = buildOAuthSpaRedirectUrl('https://app.example.com/callback', makeAuth());
    expect(url).toContain('#');
    const fragment = url.split('#')[1];
    const params = new URLSearchParams(fragment);
    expect(params.get('accessToken')).toBe('access123');
    expect(params.get('refreshToken')).toBe('refresh456');
  });

  it('trims trailing slashes from base URL', () => {
    const url = buildOAuthSpaRedirectUrl('https://app.example.com/callback///', makeAuth());
    expect(url.startsWith('https://app.example.com/callback#')).toBe(true);
  });

  it('includes userId in the fragment', () => {
    const auth = makeAuth();
    const url = buildOAuthSpaRedirectUrl('https://app.example.com', auth);
    const params = new URLSearchParams(url.split('#')[1]);
    expect(params.get('userId')).toBe(String(auth.user._id));
  });
});
