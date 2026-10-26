"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { setPrevioEstado } from "./actions";
import { Button } from "@/components/ui/button";
import type { Previo } from "@/lib/types";

export function EstadoButton({
  previoId,
  estado,
  reference,
}: {
  previoId: string;
  estado: Previo["estado"];
  reference: string;
}) {
  const [pending, startTransition] = useTransition();
  const destino = estado === "importado" ? "en_bodega" : "importado";

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() => {
        const msg =
          destino === "importado"
            ? `¿Marcar ${reference} como Importado? Pasará a Historial de previos.`
            : `¿Regresar ${reference} a Previos (En bodega)?`;
        if (!confirm(msg)) return;
        startTransition(async () => {
          const res = await setPrevioEstado(previoId, destino);
          if (res.error) toast.error(res.error);
          else toast.success(destino === "importado" ? "Movido a Historial de previos" : "Regresado a Previos");
        });
      }}
    >
      {destino === "importado" ? "Marcar importado" : "Regresar a previos"}
    </Button>
  );
}
