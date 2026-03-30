export function verificationEmailContent(
  displayName: string,
  verifyUrl: string,
): string {
  return `
    <h2 style="margin:0 0 16px;color:#18181b;font-size:20px;font-weight:600;letter-spacing:-0.3px;">
      Verify your email address
    </h2>
    <p style="margin:0 0 8px;color:#52525b;font-size:15px;line-height:1.6;">
      Hi <strong style="color:#18181b;">${displayName}</strong>,
    </p>
    <p style="margin:0 0 28px;color:#52525b;font-size:15px;line-height:1.6;">
      Thanks for signing up. Click the button below to verify your email address.
      This link expires in <strong style="color:#18181b;">24 hours</strong>.
    </p>
    <p style="margin:0 0 24px;color:#52525b;font-size:15px;line-height:1.6;">
      If you didn't create an account, you can safely ignore this email.
    </p>

    <table cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:28px;">
      <tr>
        <td style="background-color:#18181b;border-radius:6px;">
          <a
            href="${verifyUrl}"
            style="display:inline-block;padding:14px 28px;color:#ffffff;font-size:15px;font-weight:500;text-decoration:none;"
          >
            Verify email address
          </a>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 8px;color:#71717a;font-size:13px;line-height:1.6;">
      Or copy this link:
    </p>
    <p style="margin:0;font-size:13px;line-height:1.6;">
      <a href="${verifyUrl}" style="color:#18181b;word-break:break-all;">${verifyUrl}</a>
    </p>
  `.trim();
}