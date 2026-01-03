"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useActionState, useState } from "react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { updateBotInteractions, type BotResult, type Bot } from "./action";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { useEffect } from "react";

type BotProps = {
  bot: Bot | null;
};

const ConfigureBotForm = (props: BotProps) => {
  const [state, formAction, isPending] = useActionState<
    BotResult | null,
    FormData
  >(updateBotInteractions, {
    bot: props.bot,
  });

  const bot = state?.bot || props.bot;

  const [leadCapture, setLeadCapture] = useState(bot?.capture_leads || false);

  // Sync state when bot changes
  useEffect(() => {
    if (bot) {
      setLeadCapture(bot.capture_leads || false);
    }
  }, [bot]);

  useEffect(() => {
    if (state?.success) {
      toast.success(state.success);
    }
    if (state?.error) {
      toast.error(
        typeof state.error === "string"
          ? state.error
          : Object.values(state.error).flat()[0]
      );
    }
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [state?.nonce]);
  return (
    <form
      key={bot?.updated_at || bot?.id || "new"}
      action={formAction}
      className="space-y-4"
    >
      <section className="grid grid-cols-2 gap-x-3 gap-y-6">
        <div className="space-y-1">
          <Label className="text-xs font-medium text-muted-foreground">
            Bot Name
          </Label>
          <Input
            name="name"
            type="text"
            defaultValue={bot?.name}
            placeholder="Ex: Siri, Alexa, etc."
            className="text-xs"
            required
          />
          <Input
            name="bot_id"
            type="hidden"
            defaultValue={bot?.id || ""}
          ></Input>
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-medium text-muted-foreground">
            Tone
          </Label>
          <Select name="tone" required defaultValue={bot?.tone || ""}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Friendly" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="friendly">Friendly</SelectItem>
              <SelectItem value="professional">Professional</SelectItem>
              <SelectItem value="enthusiastic">Enthusiastic</SelectItem>
              <SelectItem value="casual">Casual</SelectItem>
              <SelectItem value="concise">Concise</SelectItem>
              <SelectItem value="empathetic">Empathetic</SelectItem>
              <SelectItem value="humorous">Humorous</SelectItem>
              <SelectItem value="authoritative">Authoritative</SelectItem>
              <SelectItem value="formal">Formal</SelectItem>
              <SelectItem value="neutral">Neutral</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-medium text-muted-foreground">
            Role of the Bot
          </Label>
          <Select name="role" required defaultValue={bot?.role || ""}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Customer Support" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="customer-support">Customer Support</SelectItem>
              <SelectItem value="sales">Sales</SelectItem>
              <SelectItem value="marketing">Marketing</SelectItem>
              <SelectItem value="technical-support">
                Technical Support
              </SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-medium text-muted-foreground">
            First Message
          </Label>
          <Input
            name="first_message"
            type="text"
            placeholder="Ex: Hello, how can I help you today?"
            className="text-xs"
            defaultValue={bot?.first_message || ""}
            required
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-medium text-muted-foreground">
            Lead Capture Message
          </Label>
          <Textarea
            name="lead_capture_message"
            placeholder="Can i please get your name and email for more information?"
            rows={4}
            className="text-xs min-h-[120px]"
            defaultValue={bot?.lead_capture_message || ""}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-medium text-muted-foreground">
            Confirmation Message
          </Label>
          <Textarea
            name="confirmation_message"
            placeholder="Thank you for your information! We will get back to you soon."
            rows={4}
            className="text-xs min-h-[120px]"
            defaultValue={bot?.confirmation_message || ""}
          />
        </div>
        <div className="col-span-2 space-y-1">
          <Label className="text-xs font-medium text-muted-foreground">
            Business Description
          </Label>
          <Textarea
            name="business_description"
            placeholder="Describe your business in a few sentences."
            rows={6}
            className="text-xs min-h-[120px]"
            required
            defaultValue={bot?.business_description || ""}
          />
        </div>
        <div className="col-span-2 space-y-3">
          <Label className="text-xs font-medium text-muted-foreground">
            Enable Lead Capture ?
          </Label>
          <Switch
            id="lead-capture"
            name="capture_leads"
            className="mr-2"
            checked={leadCapture}
            onCheckedChange={(checked) => {
              setLeadCapture(checked);
            }}
          />
        </div>
        <div className={cn("space-y-4", leadCapture ? "block" : "hidden")}>
          <Label className="text-xs font-medium text-muted-foreground">
            Lead Capture Timing
          </Label>
          <RadioGroup
            name="lead_capture_timing"
            defaultValue={
              bot?.lead_capture_timing === "start"
                ? "before-conversation"
                : bot?.lead_capture_timing === "after_first"
                ? "after-first-message"
                : "before-conversation"
            }
          >
            <div className="flex items-center gap-3">
              <RadioGroupItem value="before-conversation" id="r1" />
              <Label htmlFor="r1" className="text-xs text-muted-foreground">
                Before starting the conversation
              </Label>
            </div>
            <div className="flex items-center gap-3">
              <RadioGroupItem value="after-first-message" id="r2" />
              <Label
                htmlFor="r2"
                className="text-xs text-muted-foreground focus:text-sky-800"
              >
                After the first message
              </Label>
            </div>
          </RadioGroup>
        </div>
        <div className={cn("space-y-4", leadCapture ? "block" : "hidden")}>
          <Label className="text-xs font-medium text-muted-foreground">
            Lead Information to Capture
          </Label>
          <div>
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "space-y-2",
                  leadCapture ? "visible" : "invisible"
                )}
              >
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="capture-email"
                    name="capture_email"
                    defaultChecked={bot?.capture_email || false}
                  />
                  <Label
                    htmlFor="capture-email"
                    className="text-xs text-muted-foreground"
                  >
                    Email
                  </Label>
                </div>
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="capture-phone"
                    name="capture_phone"
                    defaultChecked={bot?.capture_phone || false}
                  />
                  <Label
                    htmlFor="capture-phone"
                    className="text-xs text-muted-foreground focus:text-sky-800"
                  >
                    Phone Number
                  </Label>
                </div>
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="capture-name"
                    name="capture_name"
                    defaultChecked={bot?.capture_name || false}
                  />
                  <Label
                    htmlFor="capture-name"
                    className="text-xs text-muted-foreground"
                  >
                    Name
                  </Label>
                </div>
              </div>
            </div>
          </div>
        </div>
        <Button
          type="submit"
          disabled={isPending}
          className="m lg:w-[40%] md:w-1/2 w-full"
        >
          {isPending ? (
            <>
              Saving... <Spinner />
            </>
          ) : (
            "Save Configuration"
          )}
        </Button>
      </section>
    </form>
  );
};

export default ConfigureBotForm;
