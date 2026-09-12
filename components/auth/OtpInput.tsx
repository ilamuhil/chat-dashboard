"use client";

import { cn } from "@/lib/utils";
import {
  type ChangeEvent,
  type ClipboardEvent,
  type KeyboardEvent,
  useRef,
} from "react";

type OtpInputProps = {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  disabled?: boolean;
  idPrefix: string;
  autoFocus?: boolean;
};

export function OtpInput({
  value,
  onChange,
  length = 4,
  disabled = false,
  idPrefix,
  autoFocus = false,
}: OtpInputProps) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length }, (_, index) => value[index] ?? "");

  const updateDigit = (index: number, nextDigit: string) => {
    const nextDigits = [...digits];
    nextDigits[index] = nextDigit;
    onChange(nextDigits.join("").slice(0, length));
  };

  const handleChange = (index: number, event: ChangeEvent<HTMLInputElement>) => {
    const numericValue = event.target.value.replace(/\D/g, "");

    if (!numericValue) {
      updateDigit(index, "");
      return;
    }

    if (numericValue.length > 1) {
      const nextValue = numericValue.slice(0, length);
      onChange(nextValue);
      inputRefs.current[Math.min(nextValue.length, length) - 1]?.focus();
      return;
    }

    updateDigit(index, numericValue);
    inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (
    index: number,
    event: KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }

    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      inputRefs.current[index - 1]?.focus();
    }

    if (event.key === "ArrowRight" && index < length - 1) {
      event.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (event: ClipboardEvent<HTMLDivElement>) => {
    const pastedValue = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, length);

    if (!pastedValue) return;

    event.preventDefault();
    onChange(pastedValue);
    inputRefs.current[Math.min(pastedValue.length, length) - 1]?.focus();
  };

  return (
    <div
      className="flex w-full items-center justify-between gap-2 sm:gap-3"
      onPaste={handlePaste}
      role="group"
      aria-label="One-time password"
    >
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(element) => {
            inputRefs.current[index] = element;
          }}
          id={`${idPrefix}-${index}`}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          aria-label={`OTP digit ${index + 1} of ${length}`}
          maxLength={index === 0 ? length : 1}
          value={digit}
          disabled={disabled}
          autoFocus={autoFocus && index === 0}
          onChange={(event) => handleChange(index, event)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onFocus={(event) => event.currentTarget.select()}
          className={cn(
            "h-14 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white text-center text-xl font-semibold text-slate-900 shadow-sm outline-none transition-all duration-200",
            "hover:border-sky-300 focus:-translate-y-0.5 focus:border-sky-500 focus:ring-4 focus:ring-sky-100",
            "disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400",
          )}
        />
      ))}
    </div>
  );
}
