export interface BaseTemplateOptions {
  companyName: string;
  logoUrl: string;
  content: string;
}

export function baseEmailTemplate({
  companyName,
  logoUrl,
  content,
}: BaseTemplateOptions): string {
  const logoHtml = logoUrl
    ? `
      <img
        src="${logoUrl}"
        alt="${companyName}"
        width="36"
        height="36"
        style="display:inline-block;vertical-align:middle;border-radius:6px;margin-right:10px;"
      />
    `.trim()
    : '';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#f4f4f5;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:560px;">

          <!-- Header -->
          <tr>
            <td style="background-color:#18181b;border-radius:8px 8px 0 0;padding:28px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td>
                    ${logoHtml}
                    <span style="display:inline-block;vertical-align:middle;color:#ffffff;font-size:18px;font-weight:600;letter-spacing:-0.3px;">
                      ${companyName}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="background-color:#ffffff;padding:40px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#ffffff;border-radius:0 0 8px 8px;border-top:1px solid #f4f4f5;padding:24px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td>
                    <p style="margin:0 0 4px;color:#a1a1aa;font-size:12px;line-height:1.5;">
                      You received this email from <strong style="color:#71717a;">${companyName}</strong>.
                    </p>
                    <p style="margin:0;color:#a1a1aa;font-size:12px;line-height:1.5;">
                      If you did not request this, you can safely ignore this email.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}