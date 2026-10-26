"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { enviarADocumentacion } from "./actions";
import { Button } from "@/components/ui/button";

export function EnviarDocumentacionButton({ previoId }: { previoId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await enviarADocumentacion(previoId);
          if (res.error) toast.error(res.error);
          else toast.success("Enviado a documentación");
        })
      }
    >
      {pending ? "Enviando..." : "Enviar a documentación"}
    </Button>
  );
}
