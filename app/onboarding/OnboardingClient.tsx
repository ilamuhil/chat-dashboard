"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useMutation, useQuery } from "@tanstack/react-query";

type Invite = {
  id: string;
  organizationId: string;
  organizationName: string;
  role: string;
  createdAt: string;
};

export default function OnboardingClient() {
  const router = useRouter();
  const [showInvites, setShowInvites] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [orgName, setOrgName] = useState("");
  const [orgEmail, setOrgEmail] = useState("");
  const [orgPhone, setOrgPhone] = useState("");

  const invitesQuery = useQuery({
    queryKey: ["onboarding", "invites"],
    enabled: showInvites,
    queryFn: async (): Promise<Invite[]> => {
      const res = await fetch("/api/onboarding/invites", { method: "GET" });
      const data = await res.json();
      if (!res.ok || data?.ok === false) throw new Error("Could not load invites.");
      return data.invites ?? [];
    },
  });

  const invites = invitesQuery.data ?? [];

  const createOrgMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/onboarding/organization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: orgName, email: orgEmail, phone: orgPhone }),
      });
      const data = await res.json();
      if (!res.ok || data?.ok === false) {
        throw new Error("Failed to create organization.");
      }
      return data;
    },
    onSuccess: () => {
      router.push("/dashboard");
    },
    onError: () => {
      setError("Failed to create organization. Please try again.");
    },
  });

  const acceptInviteMutation = useMutation({
    mutationFn: async (inviteId: string) => {
      const res = await fetch("/api/onboarding/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteId }),
      });
      const data = await res.json();
      if (!res.ok || data?.ok === false) {
        throw new Error("Failed to accept invite.");
      }
      return data;
    },
    onSuccess: () => {
      router.push("/dashboard");
    },
    onError: () => {
      setError("Could not accept invite. Please try again.");
    },
  });

  async function logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    try {
      window.localStorage.removeItem("auth_token");
    } catch {
      // ignore
    }
    router.push("/auth/login");
  }

  return (
    <div className="flex items-center justify-center min-h-dvh p-6">
      <Card className="w-full max-w-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Get Started</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowInvites((v) => !v)}>
              {showInvites ? "Create Organization" : "View Invites"}
            </Button>
            {!showInvites && (
              <Button variant="ghost" onClick={logout}>
                Logout
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {(error || invitesQuery.error) && (
            <div className="alert-danger mb-4">
              {error || "Could not load invites. Please try again."}
            </div>
          )}

          {!showInvites ? (
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="org-name">Organization Name</Label>
                <Input
                  id="org-name"
                  placeholder="Acme Inc"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="org-email">Organization Email (optional)</Label>
                <Input
                  id="org-email"
                  type="email"
                  placeholder="contact@acme.com"
                  value={orgEmail}
                  onChange={(e) => setOrgEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="org-phone">Organization Phone (optional)</Label>
                <Input
                  id="org-phone"
                  placeholder="+14155552671"
                  value={orgPhone}
                  onChange={(e) => setOrgPhone(e.target.value)}
                />
              </div>
              <Button
                className="w-full"
                disabled={createOrgMutation.isPending || !orgName.trim()}
                onClick={() => {
                  setError(null);
                  createOrgMutation.mutate();
                }}
              >
                Create Organization {createOrgMutation.isPending && <Spinner />}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {invitesQuery.isLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Spinner />
                </div>
              ) : invites.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  No pending invites found.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Organization</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Invited</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invites.map((invite) => (
                      <TableRow key={invite.id}>
                        <TableCell>{invite.organizationName}</TableCell>
                        <TableCell>{invite.role}</TableCell>
                        <TableCell>{new Date(invite.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            onClick={() => {
                              setError(null);
                              acceptInviteMutation.mutate(invite.id);
                            }}
                            disabled={acceptInviteMutation.isPending}
                          >
                            Accept Invite
                            {acceptInviteMutation.isPending && <Spinner />}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
