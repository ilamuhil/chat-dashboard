"use server";

import { z } from "zod";
import { resolveCurrentOrganizationId } from "@/lib/current-organization";
import { requireAuthUserId } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";

export type Bot = {
  id: string;
  organization_id: string;
  name: string;
  tone: string | null;
  role: string | null;
  business_description: string | null;
  first_message: string | null;
  confirmation_message: string | null;
  lead_capture_message: string | null;
  capture_leads: boolean;
  lead_capture_timing: "start" | "after_first" | null;
  capture_name: boolean;
  capture_email: boolean;
  capture_phone: boolean;
  created_at: string;
  updated_at: string;
};

export type BotResult = {
  error?: string | Record<string, string[]>;
  success?: string;
  bot?: Bot | null;
  nonce?: string | null;
};

const botMetSchema = z.object({
  name: z.string().min(3, "Bot name must be at least 3 characters").max(50),
  tone: z.enum([
    "friendly",
    "professional",
    "enthusiastic",
    "casual",
    "concise",
    "empathetic",
    "humorous",
    "authoritative",
    "formal",
    "neutral",
  ]),
  role: z.enum([
    "customer-support",
    "sales",
    "marketing",
    "technical-support",
    "other",
  ]),
  first_message: z.string().min(3).max(500),
  lead_capture_message: z.string().optional(),
  confirmation_message: z.string().optional(),
  business_description: z.string().min(3).max(1000),
  capture_leads: z.boolean(),
  lead_capture_timing: z
    .enum(["before-conversation", "after-first-message"])
    .optional(),
  capture_name: z.boolean().optional(),
  capture_email: z.boolean().optional(),
  capture_phone: z.boolean().optional(),
});

export async function updateBotInteractions(
  prevState: BotResult | null,
  formData: FormData
): Promise<BotResult> {
  const nonce = Date.now().toString()
  const userId = await requireAuthUserId()
  const organizationId = await resolveCurrentOrganizationId({ userId });

  if (!organizationId) {
    return { error: "You must belong to an organization to create a bot", nonce };
  }

  // Convert form data to proper types
  const captureLeadsValue = formData.get("capture_leads");
  const captureLeads =
    captureLeadsValue === "on" ||
    captureLeadsValue === "true" ||
    captureLeadsValue?.toString() === "true";

  const captureNameValue = formData.get("capture_name");
  const captureName =
    captureNameValue === "on" ||
    captureNameValue === "true" ||
    captureNameValue?.toString() === "true";

  const captureEmailValue = formData.get("capture_email");
  const captureEmail =
    captureEmailValue === "on" ||
    captureEmailValue === "true" ||
    captureEmailValue?.toString() === "true";

  const capturePhoneValue = formData.get("capture_phone");
  const capturePhone =
    capturePhoneValue === "on" ||
    capturePhoneValue === "true" ||
    capturePhoneValue?.toString() === "true";

  const validatedFields = botMetSchema.safeParse({
    name: formData.get('name'),
    tone: formData.get('tone'),
    role: formData.get('role'),
    first_message: formData.get('first_message'),
    lead_capture_message: formData.get('lead_capture_message') || '',
    confirmation_message: formData.get('confirmation_message') || '',
    business_description: formData.get('business_description'),
    capture_leads: captureLeads,
    lead_capture_timing: formData.get('lead_capture_timing'),
    capture_name: captureName,
    capture_email: captureEmail,
    capture_phone: capturePhone,
  })

  if (!validatedFields.success) {
    const fieldErrors: Record<string, string[]> = {};
    validatedFields.error.issues.forEach((issue) => {
      const path = issue.path.join(".");
      if (!fieldErrors[path]) {
        fieldErrors[path] = [];
      }
      fieldErrors[path].push(issue.message);
    });
    return { error: fieldErrors, nonce };
  }

  const data = validatedFields.data;

  // Map form values to database column names
  // leadCaptureTiming: 'before-conversation' -> 'start', 'after-first-message' -> 'after_first'
  const leadCaptureTimingDb =
    data.lead_capture_timing === "before-conversation"
      ? "start"
      : data.lead_capture_timing === "after-first-message"
      ? "after_first"
      : null;

  // Get bot_id from formData to determine if this is an update or create
  const botId = formData.get("bot_id")?.toString();

  const dbData = {
    organizationId,
    name: data.name,
    tone: data.tone,
    role: data.role,
    businessDescription: data.business_description,
    firstMessage: data.first_message,
    confirmationMessage: data.confirmation_message || null,
    leadCaptureMessage: data.lead_capture_message || null,
    captureLeads: data.capture_leads,
    leadCaptureTiming: leadCaptureTimingDb,
    captureName: data.capture_name || false,
    captureEmail: data.capture_email || false,
    capturePhone: data.capture_phone || false,
  };

  const mapBot = (b: {
    id: string
    organizationId: string | null
    name: string
    tone: string | null
    role: string | null
    businessDescription: string | null
    firstMessage: string | null
    confirmationMessage: string | null
    leadCaptureMessage: string | null
    captureLeads: boolean
    leadCaptureTiming: string | null
    captureName: boolean | null
    captureEmail: boolean | null
    capturePhone: boolean | null
    createdAt: Date
    updatedAt: Date
  }): Bot => ({
    id: b.id,
    organization_id: b.organizationId ?? organizationId,
    name: b.name,
    tone: b.tone,
    role: b.role,
    business_description: b.businessDescription,
    first_message: b.firstMessage,
    confirmation_message: b.confirmationMessage,
    lead_capture_message: b.leadCaptureMessage,
    capture_leads: b.captureLeads,
    lead_capture_timing: (b.leadCaptureTiming ?? null) as Bot["lead_capture_timing"],
    capture_name: Boolean(b.captureName),
    capture_email: Boolean(b.captureEmail),
    capture_phone: Boolean(b.capturePhone),
    created_at: b.createdAt.toISOString(),
    updated_at: b.updatedAt.toISOString(),
  })

  if (botId) {
    const existingBot = await prisma.bots.findFirst({
      where: { id: botId, organizationId },
      select: { id: true },
    })
    if (!existingBot) {
      return {
        error: "Bot not found or you don't have permission to update it",
        nonce,
      };
    }

    const updatedBot = await prisma.bots.update({
      where: { id: botId },
      data: dbData,
      select: {
        id: true,
        organizationId: true,
        name: true,
        tone: true,
        role: true,
        businessDescription: true,
        firstMessage: true,
        confirmationMessage: true,
        leadCaptureMessage: true,
        captureLeads: true,
        leadCaptureTiming: true,
        captureName: true,
        captureEmail: true,
        capturePhone: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return {
      success: "Bot configuration updated successfully",
      bot: mapBot(updatedBot),
      nonce,
    };
  } else {
    const newBot = await prisma.bots.create({
      data: dbData,
      select: {
        id: true,
        organizationId: true,
        name: true,
        tone: true,
        role: true,
        businessDescription: true,
        firstMessage: true,
        confirmationMessage: true,
        leadCaptureMessage: true,
        captureLeads: true,
        leadCaptureTiming: true,
        captureName: true,
        captureEmail: true,
        capturePhone: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return {
      success: "Bot configuration saved successfully",
      bot: mapBot(newBot),
      nonce,
    };
  }
}
