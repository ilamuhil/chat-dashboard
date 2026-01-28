"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
  const [loading, setLoading] = useState(false);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [orgName, setOrgName] = useState("");
  const [orgEmail, setOrgEmail] = useState("");
  const [orgPhone, setOrgPhone] = useState("");

  useEffect(() => {
    if (!showInvites) return;
    let active = true;
    setLoading(true);
    setError(null);
    fetch("/api/onboarding/invites", { method: "GET" })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok || data?.ok === false) throw new Error(data?.error || "Failed to load invites");
        if (active) setInvites(data.invites ?? []);
      })
      .catch((e) => {
        if (active) setError(e?.message || "Failed to load invites");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [showInvites]);

  async function createOrganization() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/onboarding/organization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: orgName, email: orgEmail, phone: orgPhone }),
      });
      const data = await res.json();
      if (!res.ok || data?.ok === false) throw new Error(data?.error || "Failed to create organization");
      router.push("/dashboard");
    } catch (e: any) {
      setError(e?.message || "Failed to create organization");
    } finally {
      setLoading(false);
    }
  }

  async function acceptInvite(inviteId: string) {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/onboarding/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteId }),
      });
      const data = await res.json();
      if (!res.ok || data?.ok === false) throw new Error(data?.error || "Failed to accept invite");
      router.push("/dashboard");
    } catch (e: any) {
      setError(e?.message || "Failed to accept invite");
    } finally {
      setLoading(false);
    }
  }

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
          {error && <div className="alert-danger mb-4">{error}</div>}

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
                disabled={loading || !orgName.trim()}
                onClick={createOrganization}
              >
                Create Organization {loading && <Spinner />}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {loading ? (
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
                            onClick={() => acceptInvite(invite.id)}
                            disabled={loading}
                          >
                            Accept Invite
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
