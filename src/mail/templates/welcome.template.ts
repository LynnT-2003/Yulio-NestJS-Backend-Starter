export function welcomeEmailContent(displayName: string): string {
  return `
    <h2 style="margin:0 0 16px;color:#18181b;font-size:20px;font-weight:600;letter-spacing:-0.3px;">
      Welcome aboard, ${displayName}!
    </h2>
    <p style="margin:0 0 16px;color:#52525b;font-size:15px;line-height:1.6;">
      Your email has been verified and your account is ready to go.
    </p>
    <p style="margin:0 0 28px;color:#52525b;font-size:15px;line-height:1.6;">
      You can now sign in and start using your account.
    </p>

    <table cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td style="background-color:#18181b;border-radius:6px;">
          <a
            href="#"
            style="display:inline-block;padding:14px 28px;color:#ffffff;font-size:15px;font-weight:500;text-decoration:none;"
          >
            Get started
          </a>
        </td>
      </tr>
    </table>
  `.trim();
}