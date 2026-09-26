"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OtpInput } from "@/components/auth/OtpInput";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Check,
  KeyRound,
  Mail,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";

type Props = {
  mode: "login" | "signup";
};

type Banner = { type: "error" | "success" | "info"; msg: string } | null;

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

  useEffect(() => {
    if (emailOtpCooldown <= 0) return;
    const timer = window.setInterval(
      () => setEmailOtpCooldown((value) => Math.max(0, value - 1)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [emailOtpCooldown]);

  useEffect(() => {
    if (loginOtpCooldown <= 0) return;
    const timer = window.setInterval(
      () => setLoginOtpCooldown((value) => Math.max(0, value - 1)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [loginOtpCooldown]);

  const canSubmitSignup = useMemo(() => {
    return (
      !!fullName.trim() &&
      !!email.trim() &&
      !!acceptTnc &&
      !!emailOtpId &&
      emailOtpCode.length === 4
    );
  }, [acceptTnc, email, emailOtpCode, emailOtpId, fullName]);

  const canSubmitLogin = useMemo(() => {
    return !!loginEmail.trim() && !!loginOtpId && loginOtpCode.length === 4;
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
      setEmailOtpCode("");
      setEmailOtpCooldown(15);
      setBanner({
        type: "success",
        msg: `We sent a 4-digit code to ${email.trim().toLowerCase()}.`,
      });
    },
    onError: (error) => {
      setBanner({
        type: "error",
        msg:
          error instanceof Error
            ? error.message
            : "Could not send email. Please try again.",
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
        email: loginEmail.trim().toLowerCase(),
      }),
    onSuccess: (data) => {
      if (data.otpId) setLoginOtpId(data.otpId);
      setLoginOtpRequested(true);
      setLoginOtpCode("");
      setLoginOtpCooldown(15);
      setBanner({
        type: "success",
        msg: `If an account exists, a 4-digit code was sent to ${loginEmail
          .trim()
          .toLowerCase()}.`,
      });
    },
    onError: (error) => {
      setBanner({
        type: "error",
        msg:
          error instanceof Error
            ? error.message
            : "Could not send email. Please try again.",
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
    onError: (error) => {
      setBanner({
        type: "error",
        msg: error instanceof Error ? error.message : "Signup failed.",
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
        requiresOrganizationSelection?: boolean;
      }>("/api/auth/login", {
        email: loginEmail.trim().toLowerCase(),
        otpId: loginOtpId,
        otpCode: loginOtpCode,
      }),
    onSuccess: (data) => {
      window.localStorage.setItem("auth_token", data.token);
      router.push(
        data.onboardingCompleted
          ? data.requiresOrganizationSelection
            ? "/auth/select-organization"
            : "/dashboard"
          : "/onboarding",
      );
    },
    onError: (error) => {
      setBanner({
        type: "error",
        msg:
          error instanceof Error
            ? error.message
            : "Login failed due to an internal server error.",
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

  const isSubmitting = signupMutation.isPending || loginMutation.isPending;
  const isSendingOtp =
    sendSignupEmailOtp.isPending || sendLoginOtp.isPending;
  const otpRequested =
    mode === "signup" ? emailOtpRequested : loginOtpRequested;
  const otpCode = mode === "signup" ? emailOtpCode : loginOtpCode;
  const otpCooldown =
    mode === "signup" ? emailOtpCooldown : loginOtpCooldown;

  const handleGoogleClick = () => {
    setBanner({
      type: "info",
      msg: "Google sign-in is not configured yet. Please continue with email.",
    });
  };

  return (
    <main className="relative min-h-dvh overflow-hidden bg-slate-50">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_10%,rgba(14,165,233,0.12),transparent_30%),radial-gradient(circle_at_5%_90%,rgba(59,130,246,0.1),transparent_26%)]" />

      <div className="relative grid min-h-dvh lg:grid-cols-[0.9fr_1.1fr]">
        <section className="relative hidden overflow-hidden bg-slate-950 px-12 py-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="absolute -left-32 top-1/3 size-80 rounded-full bg-sky-500/20 blur-3xl" />
          <div className="absolute -right-24 -top-24 size-72 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-size-[44px_44px] mask-[linear-gradient(to_bottom,black,transparent_85%)]" />

          <Link href="/" className="relative flex w-fit items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-sky-500 shadow-lg shadow-sky-500/20">
              <Bot className="size-5" />
            </span>
            <span className="text-lg font-semibold tracking-tight">
              Chat Dashboard
            </span>
          </Link>

          <div className="relative max-w-lg">
            <div className="mb-6 flex size-14 items-center justify-center rounded-2xl border border-white/10 bg-white/10 backdrop-blur">
              <Sparkles className="size-7 text-sky-300" />
            </div>
            <h1 className="max-w-md text-4xl font-semibold leading-tight tracking-[-0.04em]">
              Build conversations your customers remember.
            </h1>
            <p className="mt-5 max-w-md text-base leading-7 text-slate-300">
              Train, deploy, and improve intelligent support experiences from
              one focused workspace.
            </p>

            <div className="mt-10 grid gap-4">
              {[
                "Password-free, secure access",
                "One dashboard for every conversation",
                "Built for fast-moving support teams",
              ].map((benefit) => (
                <div
                  key={benefit}
                  className="flex items-center gap-3 text-sm text-slate-200"
                >
                  <span className="flex size-6 items-center justify-center rounded-full bg-sky-400/15 text-sky-300">
                    <Check className="size-3.5" strokeWidth={2.5} />
                  </span>
                  {benefit}
                </div>
              ))}
            </div>
          </div>

          <p className="relative text-xs text-slate-500">
            Secure access powered by one-time verification codes.
          </p>
        </section>

        <section className="flex min-h-dvh items-center justify-center px-5 py-10 sm:px-8 lg:px-14">
          <form
            onSubmit={onSubmit}
            className="w-full max-w-110 animate-in fade-in slide-in-from-bottom-2 duration-500"
          >
            <Link
              href="/"
              className="mb-6 inline-flex items-center gap-2 rounded-lg px-1 py-1 text-sm font-medium text-slate-500 transition-colors hover:text-sky-800"
            >
              <ArrowLeft className="size-4" />
              Back to website
            </Link>

            <Link href="/" className="mb-10 flex w-fit items-center gap-3 lg:hidden">
              <span className="flex size-9 items-center justify-center rounded-xl bg-slate-950 text-white">
                <Bot className="size-4.5" />
              </span>
              <span className="font-semibold tracking-tight text-slate-900">
                Chat Dashboard
              </span>
            </Link>

            <div className="mb-8">
              <div className="mb-4 flex size-11 items-center justify-center rounded-2xl border border-sky-100 bg-sky-50 text-sky-600">
                {otpRequested ? (
                  <KeyRound className="size-5" />
                ) : (
                  <ShieldCheck className="size-5" />
                )}
              </div>
              <h2 className="text-3xl font-semibold tracking-[-0.035em] text-slate-950">
                {mode === "login" ? "Welcome back" : "Create your account"}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {mode === "login"
                  ? "Enter your email and we’ll send you a secure login code."
                  : "Start building better customer conversations in minutes."}
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleClick}
              disabled={isSubmitting || isSendingOtp}
              className="h-12 w-full rounded-xl border-slate-200 bg-white font-medium text-slate-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white hover:shadow-md"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="size-4.5"
              >
                <path
                  fill="#4285F4"
                  d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.32 2.98-7.41Z"
                />
                <path
                  fill="#34A853"
                  d="M12 22c2.7 0 4.98-.9 6.63-2.43l-3.24-2.54c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z"
                />
                <path
                  fill="#FBBC05"
                  d="M6.39 13.86A6.01 6.01 0 0 1 6.08 12c0-.65.11-1.28.31-1.86V7.52H3.04A10 10 0 0 0 2 12c0 1.61.39 3.14 1.04 4.48l3.35-2.62Z"
                />
                <path
                  fill="#EA4335"
                  d="M12 6.01c1.47 0 2.79.51 3.82 1.49l2.88-2.88A9.65 9.65 0 0 0 12 2a10 10 0 0 0-8.96 5.52l3.35 2.62C7.18 7.77 9.39 6.01 12 6.01Z"
                />
              </svg>
              Continue with Google
            </Button>

            <div className="my-6 flex items-center gap-4">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">
                or continue with email
              </span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <div className="space-y-5">
              {mode === "signup" && (
                <div className="space-y-2">
                  <Label
                    htmlFor="fullname"
                    className="text-sm font-medium text-slate-700"
                  >
                    Full name
                  </Label>
                  <div className="relative">
                    <UserRound className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="fullname"
                      type="text"
                      autoComplete="name"
                      placeholder="Your full name"
                      required
                      value={fullName}
                      disabled={isSubmitting}
                      onChange={(event) => setFullName(event.target.value)}
                      className="h-12 rounded-xl border-slate-200 bg-white pl-10 shadow-sm transition-all focus-visible:border-sky-500 focus-visible:ring-sky-100"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label
                  htmlFor={mode === "login" ? "login-email" : "email"}
                  className="text-sm font-medium text-slate-700"
                >
                  Work email
                </Label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <div className="relative flex-1">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id={mode === "login" ? "login-email" : "email"}
                      type="email"
                      autoComplete="email"
                      placeholder="you@company.com"
                      required
                      value={mode === "login" ? loginEmail : email}
                      disabled={isSubmitting || isSendingOtp}
                      onChange={(event) => {
                        const nextEmail = event.target.value;
                        if (mode === "login") {
                          setLoginEmail(nextEmail);
                          setLoginOtpRequested(false);
                          setLoginOtpId(null);
                          setLoginOtpCode("");
                        } else {
                          setEmail(nextEmail);
                          setEmailOtpRequested(false);
                          setEmailOtpId(null);
                          setEmailOtpCode("");
                        }
                      }}
                      className="h-12 rounded-xl border-slate-200 bg-white pl-10 shadow-sm transition-all focus-visible:border-sky-500 focus-visible:ring-sky-100"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={
                      mode === "login"
                        ? handleSendLoginOtp
                        : handleSendSignupEmailOtp
                    }
                    disabled={
                      isSendingOtp ||
                      otpCooldown > 0 ||
                      isSubmitting
                    }
                    className="h-12 min-w-29 rounded-xl border-slate-200 bg-white shadow-sm transition-all duration-200 hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700"
                  >
                    {isSendingOtp ? (
                      <>
                        <Spinner />
                        Sending
                      </>
                    ) : otpCooldown > 0 ? (
                      `${otpCooldown}s`
                    ) : otpRequested ? (
                      "Resend"
                    ) : (
                      "Send code"
                    )}
                  </Button>
                </div>
              </div>

              {otpRequested && (
                <div className="animate-in space-y-3 fade-in slide-in-from-top-2 duration-300">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium text-slate-700">
                      Verification code
                    </Label>
                    <span className="text-xs text-slate-400">4 digits</span>
                  </div>
                  <OtpInput
                    idPrefix={mode === "login" ? "login-otp" : "signup-otp"}
                    value={otpCode}
                    onChange={
                      mode === "login"
                        ? setLoginOtpCode
                        : setEmailOtpCode
                    }
                    disabled={isSubmitting}
                    autoFocus
                  />
                  <p className="text-xs leading-5 text-slate-500">
                    Didn’t receive it?{" "}
                    <button
                      type="button"
                      onClick={
                        mode === "login"
                          ? handleSendLoginOtp
                          : handleSendSignupEmailOtp
                      }
                      disabled={otpCooldown > 0 || isSendingOtp || isSubmitting}
                      className="font-medium text-sky-700 underline-offset-4 transition-colors hover:text-sky-800 hover:underline disabled:cursor-not-allowed disabled:text-slate-400"
                    >
                      {otpCooldown > 0
                        ? `Resend in ${otpCooldown}s`
                        : "Resend code"}
                    </button>
                  </p>
                </div>
              )}

              {mode === "signup" && (
                <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3.5">
                  <Checkbox
                    id="tnc"
                    checked={acceptTnc}
                    disabled={isSubmitting}
                    onCheckedChange={(value) => setAcceptTnc(Boolean(value))}
                    className="mt-0.5"
                  />
                  <Label
                    htmlFor="tnc"
                    className="text-xs leading-5 font-normal text-slate-500"
                  >
                    I agree to the{" "}
                    <Link
                      href="/terms"
                      className="font-medium text-sky-700 underline-offset-2 hover:underline"
                    >
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link
                      href="/privacy"
                      className="font-medium text-sky-700 underline-offset-2 hover:underline"
                    >
                      Privacy Policy
                    </Link>
                    .
                  </Label>
                </div>
              )}

              <div
                role="status"
                aria-live="polite"
                className={cn(
                  "grid overflow-hidden rounded-xl text-sm transition-all duration-300",
                  banner
                    ? "grid-rows-[1fr] border px-3.5 py-3 opacity-100"
                    : "grid-rows-[0fr] border-0 px-3.5 py-0 opacity-0",
                  banner?.type === "error" &&
                    "border-red-200 bg-red-50 text-red-700",
                  banner?.type === "success" &&
                    "border-emerald-200 bg-emerald-50 text-emerald-700",
                  banner?.type === "info" &&
                    "border-sky-200 bg-sky-50 text-sky-700",
                )}
              >
                <span className="min-h-0">{banner?.msg}</span>
              </div>

              <Button
                type="submit"
                disabled={
                  isSubmitting ||
                  (mode === "signup" ? !canSubmitSignup : !canSubmitLogin)
                }
                className="group h-12 w-full overflow-hidden rounded-xl bg-slate-950 text-white shadow-lg shadow-slate-950/10 transition-all duration-200 hover:-translate-y-0.5 hover:bg-sky-600 hover:shadow-sky-600/20 disabled:translate-y-0"
              >
                {isSubmitting ? (
                  <>
                    <Spinner />
                    {mode === "login"
                      ? "Signing you in..."
                      : "Creating your account..."}
                  </>
                ) : (
                  <>
                    {mode === "login" ? "Sign in securely" : "Create account"}
                    <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </>
                )}
              </Button>
            </div>

            <p className="mt-7 text-center text-sm text-slate-500">
              {mode === "login"
                ? "New to Chat Dashboard?"
                : "Already have an account?"}{" "}
              <Link
                href={mode === "login" ? "/auth/signup" : "/auth/login"}
                className="font-semibold text-sky-700 underline-offset-4 transition-colors hover:text-sky-800 hover:underline"
              >
                {mode === "login" ? "Create an account" : "Sign in"}
              </Link>
            </p>
          </form>
        </section>
      </div>
    </main>
  );
}
