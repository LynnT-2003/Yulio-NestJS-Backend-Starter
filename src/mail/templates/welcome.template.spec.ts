import { welcomeEmailContent } from './welcome.template';

describe('welcomeEmailContent', () => {
  it('contains displayName', () => {
    const html = welcomeEmailContent('Bob');
    expect(html).toContain('Bob');
  });
});
