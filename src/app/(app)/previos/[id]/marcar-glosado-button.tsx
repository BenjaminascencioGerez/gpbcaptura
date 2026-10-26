"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { marcarGlosado } from "./actions";
import { Button } from "@/components/ui/button";

export function MarcarGlosadoButton({ previoId }: { previoId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      disabled={pending}
      onClick={() => {
        if (!confirm("¿Marcar el previo como glosado? Queda listo para facturación.")) return;
        startTransition(async () => {
          const res = await marcarGlosado(previoId);
          if (res.error) toast.error(res.error);
          else toast.success("Previo glosado");
        });
      }}
    >
      {pending ? "Guardando..." : "Marcar glosado"}
    </Button>
  );
}
