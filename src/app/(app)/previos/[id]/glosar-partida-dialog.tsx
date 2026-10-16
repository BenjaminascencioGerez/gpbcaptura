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
import type { Partida } from "@/lib/types";

export function GlosarPartidaDialog({
  previoId,
  partida,
  trigger,
}: {
  previoId: string;
  partida: Partida;
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Glosar partida {partida.no_partida}</DialogTitle>
        </DialogHeader>
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
