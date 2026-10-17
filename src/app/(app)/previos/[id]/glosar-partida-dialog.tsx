"use client";

import { useActionState, useEffect, useState } from "react";
import { glosarPartida } from "./actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { AttachmentsPreview } from "./attachments-preview";
import type { Partida, PartidaAttachment } from "@/lib/types";

export function GlosarPartidaDialog({
  previoId,
  partida,
  attachments,
  trigger,
}: {
  previoId: string;
  partida: Partida;
  attachments: PartidaAttachment[];
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const action = glosarPartida.bind(null, previoId, partida.id);
  const [state, formAction, pending] = useActionState(action, null);

  useEffect(() => {
    if (state && !state.error) setOpen(false);
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Glosar partida {partida.no_partida ?? "(sin factura)"}</DialogTitle>
        </DialogHeader>

        <div className="rounded-lg border bg-muted/30 p-3 text-sm space-y-1">
          <p className="font-medium">{partida.descripcion_aa ?? "Sin descripción"}</p>
          <p className="text-muted-foreground">
            Fracción: {partida.fraccion_arancelaria ?? "—"} {partida.nico ? `/ NICO ${partida.nico}` : ""}
            {partida.aplica_ma ? ` · ${partida.aplica_ma}` : ""}
          </p>
        </div>
        <AttachmentsPreview attachments={attachments} />
        <Separator />

        <form action={formAction} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="notas_glosa">Notas de revisión</Label>
            <Textarea
              id="notas_glosa"
              name="notas_glosa"
              rows={3}
              defaultValue={partida.notas_glosa ?? ""}
              placeholder="Observaciones de la revisión final..."
            />
          </div>
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando..." : "Marcar como glosada"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
