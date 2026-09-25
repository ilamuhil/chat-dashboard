"use client";

import {
  AlertDialog as AlertDialogRoot,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, XIcon } from "lucide-react";
import { Input } from "@/components/ui/input";

type Props = {
  title: string;
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  description: string;
  onConfirm: () => void | Promise<void>;
  isPending?: boolean;
  keepOpenUntilComplete?: boolean;
  confirmLabel?: string;
  pendingLabel?: string;
  requiredConfirmationText?: string;
  confirmationValue?: string;
  onConfirmationValueChange?: (value: string) => void;
  confirmClassName?: string;
};

export default function ConfirmationDialog(props: Props) {
  return (
    <AlertDialogRoot
      open={props.open}
      onOpenChange={open => {
        if (!props.isPending) props.setOpen(open);
      }}>
      <AlertDialogContent className="min-h-[330px] rounded-2xl border-slate-200 bg-white p-7 shadow-2xl sm:max-w-md">
        <AlertDialogCancel
          aria-label="Close"
          disabled={props.isPending}
          className="absolute top-4 right-4 size-8 rounded-full border-0 bg-slate-100 p-0 text-slate-500 hover:bg-slate-200 hover:text-slate-900">
          <XIcon className="size-4" />
          <span className="sr-only">Close</span>
        </AlertDialogCancel>
        <AlertDialogHeader className="border-b border-slate-100 pb-4 pr-8">
          <AlertDialogTitle>{props.title}</AlertDialogTitle>
          <AlertDialogDescription>
            {props.description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {props.requiredConfirmationText && (
          <div className="space-y-4 px-1 pt-2">
            <label
              htmlFor="confirmation-value"
              className="block text-sm font-medium text-slate-700">
              Type{" "}
              <span className="font-bold text-slate-900">
                {props.requiredConfirmationText}
              </span>{" "}
              to continue
            </label>
            <Input
              id="confirmation-value"
              value={props.confirmationValue || ""}
              onChange={event =>
                props.onConfirmationValueChange?.(event.target.value)
              }
              placeholder={props.requiredConfirmationText}
              autoComplete="off"
              disabled={props.isPending}
              className="mt-2 text-sm"
            />
          </div>
        )}
        <AlertDialogFooter className="pt-5">
          <AlertDialogCancel
            disabled={props.isPending}
            onClick={() => props.setOpen(false)}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={
              props.isPending ||
              (props.requiredConfirmationText !== undefined &&
                props.confirmationValue !== props.requiredConfirmationText)
            }
            className={props.confirmClassName}
            onClick={async event => {
              if (props.keepOpenUntilComplete) {
                event.preventDefault();
              }
              await props.onConfirm();
            }}>
            {props.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            {props.isPending
              ? props.pendingLabel || "Working…"
              : props.confirmLabel || "Continue"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialogRoot>
  );
}
