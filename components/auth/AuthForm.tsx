"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";

type Props = {
  mode: "login" | "signup";
};

type Banner = { type: "error" | "success"; msg: string } | null;

export default function AuthForm(props: Props) {
  const router = useRouter();
  const { mode } = props;

  const [banner, setBanner] = useState<Banner>(null);

  // Signup
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  // no password-based login/signup
  const [acceptTnc, setAcceptTnc] = useState(false);
  const [emailOtpId, setEmailOtpId] = useState<string | null>(null);
  const [emailOtpCode, setEmailOtpCode] = useState("");
  const [emailOtpRequested, setEmailOtpRequested] = useState(false);
  const [emailOtpCooldown, setEmailOtpCooldown] = useState(0);

  // Login
  const [loginEmail, setLoginEmail] = useState("");
  const [loginOtpId, setLoginOtpId] = useState<string | null>(null);
  const [loginOtpCode, setLoginOtpCode] = useState("");
  const [loginOtpRequested, setLoginOtpRequested] = useState(false);
  const [loginOtpCooldown, setLoginOtpCooldown] = useState(0);

  const startCooldown = (setter: (v: number) => void) => {
    setter(15);
  };

  const tickCooldown = (value: number, setter: (v: number) => void) => {
    if (value <= 0) return;
    const id = setTimeout(() => setter(value - 1), 1000);
    return () => clearTimeout(id);
  };

  // cooldown ticks
  if (emailOtpCooldown > 0) tickCooldown(emailOtpCooldown, setEmailOtpCooldown);
  if (loginOtpCooldown > 0) tickCooldown(loginOtpCooldown, setLoginOtpCooldown);

  const canSubmitSignup = useMemo(() => {
    return (
      !!fullName.trim() &&
      !!email.trim() &&
      !!acceptTnc &&
      !!emailOtpId &&
      !!emailOtpCode.trim()
    );
  }, [acceptTnc, email, emailOtpCode, emailOtpId, fullName]);

  const canSubmitLogin = useMemo(() => {
    return !!loginEmail.trim() && !!loginOtpId && !!loginOtpCode.trim();
  }, [loginEmail, loginOtpCode, loginOtpId]);

  async function postJson<T>(url: string, body: unknown): Promise<T> {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok || data?.ok === false) {
      throw new Error(data?.error || "Request failed");
    }
    return data as T;
  }

  const sendSignupEmailOtp = useMutation({
    mutationFn: () =>
      postJson<{ ok: true; otpId: string }>("/api/auth/otp/request", {
        channel: "email",
        purpose: "signup_email",
        email,
      }),
    onSuccess: (data) => {
      setEmailOtpId(data.otpId);
      setEmailOtpRequested(true);
      startCooldown(setEmailOtpCooldown);
    },
    onError: () => {
      setBanner({
        type: "error",
        msg: "Could not send email. Please try again.",
      });
    },
  });

  async function handleSendSignupEmailOtp() {
    setBanner(null);
    if (!email.trim()) {
      setBanner({ type: "error", msg: "Enter your email first." });
      return;
    }
    if (emailOtpCooldown > 0) {
      setBanner({ type: "error", msg: `Please wait ${emailOtpCooldown}s before resending.` });
      return;
    }
    sendSignupEmailOtp.mutate();
  }

  const sendLoginOtp = useMutation({
    mutationFn: () =>
      postJson<{ ok: true; otpId?: string }>("/api/auth/otp/request", {
        channel: "email",
        purpose: "login",
        email: loginEmail.trim(),
      }),
    onSuccess: (data) => {
      if (data.otpId) setLoginOtpId(data.otpId);
      setLoginOtpRequested(true);
      startCooldown(setLoginOtpCooldown);
    },
    onError: () => {
      setBanner({
        type: "error",
        msg: "Could not send email. Please try again.",
      });
    },
  });

  async function handleSendLoginOtp() {
    setBanner(null);
    const raw = loginEmail.trim();
    if (!raw) {
      setBanner({ type: "error", msg: "Enter your email first." });
      return;
    }
    if (loginOtpCooldown > 0) {
      setBanner({ type: "error", msg: `Please wait ${loginOtpCooldown}s before resending.` });
      return;
    }
    sendLoginOtp.mutate();
  }

  const signupMutation = useMutation({
    mutationFn: () =>
      postJson<{ ok: true; token: string; onboardingCompleted?: boolean }>("/api/auth/signup", {
        fullName,
        email,
        acceptTnc,
        emailOtpId,
        emailOtpCode,
      }),
    onSuccess: (data) => {
      window.localStorage.setItem("auth_token", data.token);
      router.push("/onboarding");
    },
    onError: () => {
      setBanner({
        type: "error",
        msg: "Signup failed due to an internal server error.",
      });
    },
  });

  const loginMutation = useMutation({
    mutationFn: () =>
      postJson<{
        ok: true;
        token: string;
        onboardingCompleted?: boolean;
        organizationId?: string | null;
      }>("/api/auth/login", { email: loginEmail, otpId: loginOtpId, otpCode: loginOtpCode }),
    onSuccess: (data) => {
      window.localStorage.setItem("auth_token", data.token);
      router.push(data.onboardingCompleted ? "/dashboard" : "/onboarding");
    },
    onError: () => {
      setBanner({
        type: "error",
        msg: "Login failed due to an internal server error.",
      });
    },
  });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBanner(null);
    try {
      if (mode === "signup") {
        if (!canSubmitSignup) {
          setBanner({
            type: "error",
            msg: "Please enter the email OTP and accept the Terms & Conditions.",
          });
          return;
        }
        signupMutation.mutate();
      } else {
        if (!canSubmitLogin) {
          setBanner({ type: "error", msg: "Please enter the OTP to login." });
          return;
        }
        loginMutation.mutate();
      }
    } catch {
      setBanner({
        type: "error",
        msg:
          mode === "signup"
            ? "Signup failed due to an internal server error."
            : "Login failed due to an internal server error.",
      });
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex justify-center items-center h-dvh">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className={cn("text-2xl font-bold")}>
            {mode === "login" ? "Login" : "Create an account"}
          </CardTitle>
          <CardDescription>
            {mode === "login"
              ? "Login with email + OTP"
              : "Verify email with OTP to sign up"}
          </CardDescription>
          <CardAction>
            <Link href={mode === "login" ? "/auth/signup" : "/auth/login"}>
              {mode === "login" ? "Sign Up" : "Login"}
            </Link>
          </CardAction>
        </CardHeader>

        <CardContent>
          <div className="flex flex-col gap-6">
            <div
              className={cn(
                banner?.type === "success" && "alert-success",
                banner?.type === "error" && "alert-danger",
                !banner && "-translate-y-full opacity-0 h-0 pointer-events-none"
              )}
            >
              {banner?.msg}
            </div>

            {mode === "signup" ? (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="fullname">Full Name</Label>
                  <Input
                    id="fullname"
                    type="text"
                    placeholder="Akash Kumar"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="flex gap-2">
                    <Input
                      id="email"
                      type="email"
                      placeholder="m@example.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSendSignupEmailOtp}
                      disabled={
                        sendSignupEmailOtp.isPending ||
                        emailOtpCooldown > 0 ||
                        signupMutation.isPending ||
                        loginMutation.isPending
                      }
                    >
                      {emailOtpCooldown > 0
                        ? `Resend in ${emailOtpCooldown}s`
                        : "Send OTP"}
                      {sendSignupEmailOtp.isPending && <Spinner />}
                    </Button>
                  </div>
                  {emailOtpRequested && (
                    <Input
                      id="email-otp"
                      type="text"
                      inputMode="numeric"
                      placeholder="Enter email OTP"
                      required
                      value={emailOtpCode}
                      onChange={(e) => setEmailOtpCode(e.target.value)}
                    />
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="tnc"
                    checked={acceptTnc}
                    onCheckedChange={(v) => setAcceptTnc(Boolean(v))}
                  />
                  <Label htmlFor="tnc" className="text-sm">
                    I accept the Terms & Conditions
                  </Label>
                </div>
              </>
            ) : (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="login-email">Email</Label>
                  <div className="flex gap-2">
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="m@example.com"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSendLoginOtp}
                      disabled={
                        sendLoginOtp.isPending ||
                        loginOtpCooldown > 0 ||
                        signupMutation.isPending ||
                        loginMutation.isPending
                      }
                    >
                      {loginOtpCooldown > 0
                        ? `Resend in ${loginOtpCooldown}s`
                        : "Send OTP"}
                      {sendLoginOtp.isPending && <Spinner />}
                    </Button>
                  </div>
                </div>

                {loginOtpRequested && (
                  <div className="grid gap-2">
                    <div className="flex items-center">
                      <Label htmlFor="login-otp">OTP</Label>
                    </div>
                    <Input
                      id="login-otp"
                      type="text"
                      inputMode="numeric"
                      placeholder="Enter OTP"
                      required
                      value={loginOtpCode}
                      onChange={(e) => setLoginOtpCode(e.target.value)}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex-col gap-2">
          <Button
            type="submit"
            className="w-full"
            disabled={
              signupMutation.isPending ||
              loginMutation.isPending ||
              (mode === "signup" ? !canSubmitSignup : !canSubmitLogin)
            }
          >
            {mode === "login" ? "Login" : "Sign up"}
            {(signupMutation.isPending || loginMutation.isPending) && <Spinner />}
          </Button>

          <Button
            disabled={signupMutation.isPending || loginMutation.isPending}
            type="button"
            variant="outline"
            className="w-full"
          >
            {mode === "login" ? "Login with Google" : "Sign up with Google"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
