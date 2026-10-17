"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { importMorePartidas } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function ImportMorePartidasDialog({
  previoId,
  trigger,
}: {
  previoId: string;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const action = importMorePartidas.bind(null, previoId);
  const [state, formAction, pending] = useActionState(action, null);

  useEffect(() => {
    if (state && !state.error) {
      if (state.message) toast.success(state.message);
      setOpen(false);
    }
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Cargar más partidas desde Excel</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="import-more-file">Reporte de Previo (.xlsx)</Label>
            <Input id="import-more-file" name="file" type="file" accept=".xlsx" required />
            <p className="text-xs text-muted-foreground">
              Se agregan las partidas de este archivo a las que ya tiene este previo — no crea uno nuevo.
            </p>
          </div>
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Importando..." : "Agregar partidas"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
