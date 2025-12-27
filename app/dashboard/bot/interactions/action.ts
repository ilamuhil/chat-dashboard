"use server";

import { createClient } from "@/lib/supabase-server";
import { z } from "zod";

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
  const supabase = await createClient()

  
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) {
    return { error: "You must be logged in to update bot configuration" };
  }

  // Get user's organization
  const { data: organizationMember, error: orgError } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .single();

  if (orgError || !organizationMember) {
    return { error: "You must belong to an organization to create a bot" };
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
    return { error: fieldErrors };
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

  // Check if bot already exists for this organization
  const { data: existingBot } = await supabase
    .from("bots")
    .select("id")
    .eq("organization_id", organizationMember.organization_id)
    .maybeSingle();

  const botData = {
    organization_id: organizationMember.organization_id,
    name: data.name,
    tone: data.tone,
    role: data.role,
    business_description: data.business_description,
    first_message: data.first_message,
    confirmation_message: data.confirmation_message || null,
    lead_capture_message: data.lead_capture_message || null,
    capture_leads: data.capture_leads,
    lead_capture_timing: leadCaptureTimingDb,
    capture_name: data.capture_name || false,
    capture_email: data.capture_email || false,
    capture_phone: data.capture_phone || false,
    updated_at: new Date().toISOString(),
  };

  if (existingBot) {
    // Update existing bot
    const { data: updatedBot, error: updateError } = await supabase
      .from("bots")
      .update(botData)
      .eq("id", existingBot.id)
      .select()
      .single();

    if (updateError) {
      console.error("Bot update error:", updateError);
      return { error: updateError.message };
    }

    return {
      success: "Bot configuration updated successfully",
      bot: updatedBot,
    };
  } else {
    // Create new bot
    const { data: newBot, error: insertError } = await supabase
      .from("bots")
      .insert(botData)
      .select()
      .single();

    if (insertError) {
      console.error("Bot creation error:", insertError);
      return { error: insertError.message };
    }

    return {
      success: "Bot configuration saved successfully",
      bot: newBot,
    };
  }
}
