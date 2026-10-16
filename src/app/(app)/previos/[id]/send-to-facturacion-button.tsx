"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { sendToFacturacion } from "./actions";
import { Button } from "@/components/ui/button";

export function SendToFacturacionButton({ previoId, disabled }: { previoId: string; disabled?: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      disabled={disabled || pending}
      onClick={() =>
        startTransition(async () => {
          const res = await sendToFacturacion(previoId);
          if (res?.error) toast.error(res.error);
          else toast.success("Enviado a GPBFacturación");
        })
      }
    >
      {pending ? "Enviando..." : "Enviar a Facturación"}
    </Button>
  );
}
