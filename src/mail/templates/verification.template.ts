export function verificationEmailTemplate(
  displayName: string,
  verifyUrl: string,
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify your email</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background-color:#18181b;padding:32px 40px;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:600;">AuthForge</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 16px;color:#18181b;font-size:20px;font-weight:600;">
                Verify your email address
              </h2>
              <p style="margin:0 0 24px;color:#52525b;font-size:15px;line-height:1.6;">
                Hi ${displayName}, thanks for signing up. Click the button below to verify your email address. This link expires in <strong>24 hours</strong>.
              </p>

              <!-- Button -->
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color:#18181b;border-radius:6px;">
                    <a href="${verifyUrl}"
                       style="display:inline-block;padding:14px 28px;color:#ffffff;font-size:15px;font-weight:500;text-decoration:none;">
                      Verify email address
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:24px 0 0;color:#71717a;font-size:13px;line-height:1.6;">
                If you didn't create an account, you can safely ignore this email.
              </p>
              <p style="margin:12px 0 0;color:#71717a;font-size:13px;">
                Or copy this link: <a href="${verifyUrl}" style="color:#18181b;">${verifyUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;border-top:1px solid #f4f4f5;">
              <p style="margin:0;color:#a1a1aa;font-size:12px;">
                This email was sent by AuthForge. Link expires in 24 hours.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}