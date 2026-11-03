import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyPaystackSignature(payload: string, signature: string | null) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret || !signature) return false;
  const expected = createHmac("sha512", secret).update(payload).digest("hex");
  const received = Buffer.from(signature, "utf8");
  const calculated = Buffer.from(expected, "utf8");
  return received.length === calculated.length && timingSafeEqual(received, calculated);
}

export async function initializePaystackPayment(input: { email: string; amountNaira: number; reference: string; callbackUrl: string; metadata: Record<string, string> }) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) throw new Error("PAYSTACK_NOT_CONFIGURED");
  const response = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email: input.email, amount: Math.round(input.amountNaira * 100), reference: input.reference, callback_url: input.callbackUrl, metadata: input.metadata }),
    cache: "no-store",
  });
  const data = await response.json() as { status: boolean; message: string; data?: { authorization_url: string; access_code: string; reference: string } };
  if (!response.ok || !data.status || !data.data) throw new Error(data.message || "PAYSTACK_INITIALIZATION_FAILED");
  return data.data;
}
