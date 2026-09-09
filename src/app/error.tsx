"use client";
import { useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { getErrorMessage } from "@/lib/utils";

export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-[400px] p-8 text-center rounded-[24px]">
        <AlertCircle className="h-10 w-10 mx-auto text-amber-600" aria-hidden="true" />
        <h1 className="font-bold text-lg mt-3">Ada yang tersendat</h1>
        <p className="text-sm text-muted-foreground mt-2 leading-6">{getErrorMessage(error, "Halaman tidak bisa dimuat. Coba lagi.")}</p>
        <Button className="w-full rounded-full mt-6" onClick={() => reset()}>
          Coba lagi
        </Button>
      </Card>
    </div>
  );
}
