"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ConfigureBotForm from "./ConfigureBotForm";
import type { Bot } from "./action";
import { PlusIcon } from "lucide-react";

type BotInteractionsClientProps = {
  bots: Bot[];
};

export default function BotInteractionsClient({ bots }: BotInteractionsClientProps) {
  const [selectedBot, setSelectedBot] = useState<Bot | null>(null);
  const [showForm, setShowForm] = useState(false);

  const handleBotClick = (bot: Bot) => {
    setSelectedBot(bot);
    setShowForm(true);
  };

  const handleCreateNew = () => {
    setSelectedBot(null);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    // Refresh the page to show updated bot list
    window.location.reload();
  };

  // If form is shown, display the form
  if (showForm) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => {
              setShowForm(false);
              setSelectedBot(null);
            }}
          >
            ← Back to Bots
          </Button>
          <h2 className="text-lg font-semibold">
            {selectedBot ? "Edit Bot" : "Create New Bot"}
          </h2>
        </div>
        <ConfigureBotForm bot={selectedBot} onSuccess={handleFormSuccess} />
      </div>
    );
  }

  // If no bots exist, show create new bot button
  if (bots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="text-muted-foreground">
            <p className="text-lg mb-2">No bots configured yet</p>
            <p className="text-sm">
              Create your first bot to start interacting with your customers
            </p>
          </div>
          <Button onClick={handleCreateNew} size="lg" className="gap-2">
            <PlusIcon className="h-4 w-4" />
            Create New Bot
          </Button>
        </div>
      </div>
    );
  }

  // Show list of bot cards
  const colorVariants = [
    "bg-gradient-to-br from-blue-50/50 to-indigo-50/30 border-blue-100/50",
    "bg-gradient-to-br from-purple-50/50 to-pink-50/30 border-purple-100/50",
    "bg-gradient-to-br from-emerald-50/50 to-teal-50/30 border-emerald-100/50",
    "bg-gradient-to-br from-amber-50/50 to-orange-50/30 border-amber-100/50",
    "bg-gradient-to-br from-rose-50/50 to-red-50/30 border-rose-100/50",
    "bg-gradient-to-br from-cyan-50/50 to-blue-50/30 border-cyan-100/50",
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button onClick={handleCreateNew} variant="default" size="sm" className="gap-2">
          <PlusIcon className="h-4 w-4" />
          Create New Bot
        </Button>
        <p className="text-sm text-muted-foreground">
          {bots.length} {bots.length === 1 ? "bot" : "bots"} configured
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {bots.map((bot, index) => (
          <Card
            key={bot.id}
            className={`cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all duration-200 ${colorVariants[index % colorVariants.length]}`}
            onClick={() => handleBotClick(bot)}
          >
            <CardHeader className="pb-2 px-4 pt-4">
              <CardTitle className="text-sm font-semibold leading-tight">{bot.name}</CardTitle>
              <CardDescription className="text-xs capitalize mt-1">
                {bot.role?.replace("-", " ")} • {bot.tone}
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                  {bot.business_description}
                </p>
                {bot.capture_leads && (
                  <div className="flex items-center gap-2 pt-1">
                    <span className="px-2 py-0.5 bg-primary/15 text-primary rounded-md text-xs font-medium">
                      Lead Capture
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

