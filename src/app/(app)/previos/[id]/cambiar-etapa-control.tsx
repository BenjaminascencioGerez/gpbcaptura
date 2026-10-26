"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ETAPA_LABELS, type Etapa } from "@/lib/previo-progreso";
import { cambiarEtapa } from "./actions";

const ETAPAS = ["revision_fisica", "clasificacion", "glosa", "documentacion", "glosa_final"] as const;

// Solo Super Admin: adelanta o regresa la etapa aunque falten datos.
export function CambiarEtapaControl({ previoId, etapaActual }: { previoId: string; etapaActual: Etapa }) {
  const [etapa, setEtapa] = useState<(typeof ETAPAS)[number]>(
    (ETAPAS as readonly string[]).includes(etapaActual) ? (etapaActual as (typeof ETAPAS)[number]) : "revision_fisica"
  );
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-2 rounded-md border border-dashed px-2 py-1">
      <span className="text-xs text-muted-foreground">Super Admin · etapa</span>
      <select
        aria-label="Cambiar etapa"
        value={etapa}
        onChange={(e) => setEtapa(e.target.value as (typeof ETAPAS)[number])}
        className="h-8 rounded-md border border-input bg-background px-2 text-sm"
      >
        {ETAPAS.map((e) => (
          <option key={e} value={e}>
            {ETAPA_LABELS[e]}
          </option>
        ))}
      </select>
      <Button
        size="sm"
        variant="outline"
        disabled={pending || etapa === etapaActual}
        onClick={() => {
          if (!confirm(`¿Mover el previo a "${ETAPA_LABELS[etapa]}" aunque no esté completo?`)) return;
          startTransition(async () => {
            const res = await cambiarEtapa(previoId, etapa);
            if (res.error) toast.error(res.error);
            else toast.success(`Etapa cambiada a ${ETAPA_LABELS[etapa]}`);
          });
        }}
      >
        {pending ? "Moviendo..." : "Mover"}
      </Button>
    </div>
  );
}
