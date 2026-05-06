import { verificationEmailContent } from './verification.template';

describe('verificationEmailContent', () => {
  it('contains displayName', () => {
    const html = verificationEmailContent('Alice', 'https://example.com/verify?token=abc');
    expect(html).toContain('Alice');
  });

  it('contains verifyUrl in both button href and plain link', () => {
    const verifyUrl = 'https://example.com/verify?token=abc';
    const html = verificationEmailContent('Alice', verifyUrl);
    const count = (html.match(new RegExp(verifyUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) ?? []).length;
    expect(count).toBeGreaterThanOrEqual(2);
  });
});
