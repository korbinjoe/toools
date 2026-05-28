"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle2, Loader2 } from "lucide-react";
import { submitTool } from "./actions";

interface SubmitFormProps {
  categories: { id: string; name: string }[];
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">
        {label} <span className="text-destructive">*</span>
      </label>
      {children}
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}

const inputClass =
  "h-11 w-full rounded-xl border border-border bg-card px-3.5 text-sm outline-none transition-all duration-200 placeholder:text-stone-400 focus:ring-2 focus:ring-primary/20 focus:border-primary/40";

const textareaClass =
  "w-full rounded-xl border border-border bg-card px-3.5 py-3 text-sm outline-none transition-all duration-200 placeholder:text-stone-400 focus:ring-2 focus:ring-primary/20 focus:border-primary/40 resize-none";

export function SubmitForm({ categories }: SubmitFormProps) {
  const [state, formAction, isPending] = useActionState(submitTool, {
    success: false,
    errors: {} as Record<string, string>,
  });

  if (state.success) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-14 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50">
          <CheckCircle2 className="h-7 w-7 text-emerald-600" />
        </div>
        <h2 className="text-lg font-semibold">Tool Submitted</h2>
        <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
          Thank you. We will review your submission and add it to the directory once approved.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
      <form action={formAction} className="space-y-5">
        <Field label="Tool Name" error={state.errors?.name}>
          <input
            name="name"
            placeholder="e.g. Figma"
            required
            className={inputClass}
          />
        </Field>

        <Field label="Website URL" error={state.errors?.url}>
          <input
            name="url"
            type="url"
            placeholder="https://example.com"
            required
            className={inputClass}
          />
        </Field>

        <Field label="Tagline" error={state.errors?.tagline}>
          <input
            name="tagline"
            placeholder="A short description of the tool"
            required
            className={inputClass}
          />
        </Field>

        <Field label="Description" error={state.errors?.description}>
          <textarea
            name="description"
            placeholder="Tell us more about this tool..."
            rows={4}
            required
            className={textareaClass}
          />
        </Field>

        <Field label="Category" error={state.errors?.categoryId}>
          <Select name="categoryId" required>
            <SelectTrigger className="h-11 rounded-xl">
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Pricing" error={state.errors?.pricing}>
          <Select name="pricing" required>
            <SelectTrigger className="h-11 rounded-xl">
              <SelectValue placeholder="Select pricing model" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="FREE">Free</SelectItem>
              <SelectItem value="FREEMIUM">Freemium</SelectItem>
              <SelectItem value="PAID">Paid</SelectItem>
              <SelectItem value="OPEN_SOURCE">Open Source</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Button
          type="submit"
          className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-200 active:translate-y-px"
          disabled={isPending}
        >
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Submit Tool
        </Button>
      </form>
    </div>
  );
}
