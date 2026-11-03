import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPaystackSignature } from "@/lib/paystack";

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!verifyPaystackSignature(rawBody, request.headers.get("x-paystack-signature"))) return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  let event: { event?: string; data?: { reference?: string; status?: string; paid_at?: string; metadata?: Record<string, string> } };
  try {
    event = JSON.parse(rawBody) as typeof event;
  } catch {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }
  if (event.event === "charge.success" && event.data?.reference) {
    const payment = await prisma.payment.findUnique({ where: { reference: event.data.reference } });
    if (payment && payment.status !== "PAID") {
      await prisma.payment.update({ where: { id: payment.id }, data: { status: "PAID", paidAt: event.data.paid_at ? new Date(event.data.paid_at) : new Date(), metadata: event.data.metadata } });
      await prisma.auditLog.create({ data: { schoolId: payment.schoolId, action: "payment.verified", entity: "Payment", entityId: payment.id, metadata: { reference: payment.reference } } });
    }
  }
  return NextResponse.json({ received: true });
}
