interface InviteEmailParams {
  inviterName: string;
  workspaceName: string;
  inviteLink: string;
}

export function getInviteEmailHtml(params: InviteEmailParams): string {
  const { inviterName, workspaceName, inviteLink } = params;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0A0A0A; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0A0A0A; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background-color: #1A1A1A; border-radius: 12px; border: 1px solid #2A2A2A;">
          <tr>
            <td style="padding: 40px;">
              <h1 style="margin: 0 0 8px; font-size: 20px; font-weight: 600; color: #FAFAFA;">
                ito
              </h1>
              <p style="margin: 0 0 24px; font-size: 14px; color: #888;">
                Thread-based task collaboration
              </p>
              <hr style="border: none; border-top: 1px solid #2A2A2A; margin: 0 0 24px;">
              <p style="margin: 0 0 16px; font-size: 15px; color: #E0E0E0; line-height: 1.6;">
                <strong style="color: #FAFAFA;">${inviterName}</strong> invited you to join
                <strong style="color: #FAFAFA;">${workspaceName}</strong>.
              </p>
              <p style="margin: 0 0 32px; font-size: 14px; color: #888; line-height: 1.5;">
                Click the button below to accept the invitation and start collaborating.
              </p>
              <table cellpadding="0" cellspacing="0" style="margin: 0 0 32px;">
                <tr>
                  <td style="background-color: #FAFAFA; border-radius: 8px; padding: 12px 32px;">
                    <a href="${inviteLink}" style="color: #0A0A0A; text-decoration: none; font-size: 14px; font-weight: 600;">
                      Join Workspace
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 0 0 8px; font-size: 12px; color: #666; line-height: 1.5;">
                Or copy and paste this link:
              </p>
              <p style="margin: 0 0 24px; font-size: 12px; color: #888; word-break: break-all;">
                ${inviteLink}
              </p>
              <hr style="border: none; border-top: 1px solid #2A2A2A; margin: 0 0 16px;">
              <p style="margin: 0; font-size: 11px; color: #555;">
                This invitation expires in 7 days. If you didn't expect this email, you can safely ignore it.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
