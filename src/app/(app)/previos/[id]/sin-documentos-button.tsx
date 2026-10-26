"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { marcarSinDocumentos } from "./actions";
import { Button } from "@/components/ui/button";

export function SinDocumentosButton({ previoId, sinDocumentos }: { previoId: string; sinDocumentos: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() => {
        let nota: string | null = null;
        if (!sinDocumentos) {
          nota = prompt("¿Qué documentos faltan? (factura, packing list…)", "");
          if (nota === null) return;
        }
        startTransition(async () => {
          const res = await marcarSinDocumentos(previoId, !sinDocumentos, nota);
          if (res.error) toast.error(res.error);
          else toast.success(sinDocumentos ? "Documentos recibidos" : "Marcado sin documentos");
        });
      }}
    >
      {pending ? "Guardando..." : sinDocumentos ? "Documentos recibidos" : "Marcar sin documentos"}
    </Button>
  );
}
