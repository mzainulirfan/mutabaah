"use client";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export function AuthSubmitButton({
  children,
  pendingText,
  formAction,
}: {
  children: React.ReactNode;
  pendingText: string;
  formAction: (formData: FormData) => void | Promise<void>;
}) {
  const { pending } = useFormStatus();
  return (
    <Button formAction={formAction} size="lg" className="w-full rounded-full" disabled={pending}>
      {pending && <Loader2 className="h-4 w-4 animate-spin mr-2" aria-hidden="true" />}
      {pending ? pendingText : children}
    </Button>
  );
}
