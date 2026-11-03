export async function sendPasswordResetEmail(input: { to: string; name: string; token: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(input.token)}`;
  if (!apiKey || !from || apiKey === "re_replace_me") throw new Error("EMAIL_NOT_CONFIGURED");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: "Reset your Learnzy Hub password",
      html: `<p>Hello ${input.name},</p><p>Use the link below to reset your password. It expires in one hour.</p><p><a href="${resetUrl}">Reset password</a></p><p>If you did not request this, you can ignore this email.</p>`,
    }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("EMAIL_DELIVERY_FAILED");
}
