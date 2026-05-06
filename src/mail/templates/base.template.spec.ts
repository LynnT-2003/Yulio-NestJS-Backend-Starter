import { baseEmailTemplate } from './base.template';

describe('baseEmailTemplate', () => {
  it('includes companyName and content in output', () => {
    const html = baseEmailTemplate({ companyName: 'Acme', logoUrl: '', content: '<p>hello</p>' });
    expect(html).toContain('Acme');
    expect(html).toContain('<p>hello</p>');
  });

  it('includes img tag when logoUrl is provided', () => {
    const html = baseEmailTemplate({ companyName: 'Acme', logoUrl: 'https://example.com/logo.png', content: '' });
    expect(html).toContain('<img');
    expect(html).toContain('https://example.com/logo.png');
  });

  it('omits img tag when logoUrl is empty', () => {
    const html = baseEmailTemplate({ companyName: 'Acme', logoUrl: '', content: '' });
    expect(html).not.toContain('<img');
  });
});
