"use client";

import { useActionState, useEffect, useState } from "react";
import { revisarFraccion } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { AttachmentsPreview } from "./attachments-preview";
import { etiquetaPartida } from "@/lib/partida";
import type { Partida, PartidaAttachment } from "@/lib/types";

// Revisión de la fracción por quien confirma (rol Glosador): confirmar (con
// opción de corregir la fracción), pedir más información o regresar al clasificador.
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
  const action = revisarFraccion.bind(null, previoId, partida.id);
  const [state, formAction, pending] = useActionState(action, null);

  useEffect(() => {
    if (state && !state.error) setOpen(false);
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Revisar fracción — partida {etiquetaPartida(partida)}</DialogTitle>
          <DialogDescription>
            Confirma la fracción (puedes corregirla), pide más información o regrésala al clasificador.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border bg-muted/30 p-3 text-sm space-y-1">
          <p className="font-medium">{partida.descripcion_aa ?? "Sin descripción"}</p>
          <p className="text-muted-foreground">
            {[partida.marca, partida.modelo, partida.numserie].filter(Boolean).join(" · ") || "Sin marca/modelo"}
          </p>
          {partida.aplica_ma && <p className="text-muted-foreground">Regulaciones: {partida.aplica_ma}</p>}
          {partida.revision_estado && partida.revision_nota && (
            <p className="text-amber-700">Última observación: {partida.revision_nota}</p>
          )}
        </div>
        <AttachmentsPreview attachments={attachments} />
        <Separator />

        <form action={formAction} className="space-y-4">
          <div className="grid grid-cols-[1fr_6rem] gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="fraccion_arancelaria">Fracción arancelaria</Label>
              <Input
                id="fraccion_arancelaria"
                name="fraccion_arancelaria"
                inputMode="numeric"
                maxLength={8}
                defaultValue={partida.fraccion_arancelaria ?? ""}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nico">NICO</Label>
              <Input id="nico" name="nico" inputMode="numeric" maxLength={2} defaultValue={partida.nico ?? ""} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Si cambias la fracción o el NICO y confirmas, el cambio queda anotado en la partida.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="nota">Notas / qué se necesita</Label>
            <Textarea
              id="nota"
              name="nota"
              rows={3}
              placeholder="Ej. enviar datasheet del equipo, foto de la placa con el número de serie…"
            />
            <p className="text-xs text-muted-foreground">
              Obligatorio para pedir información o regresar la partida; opcional al confirmar.
            </p>
          </div>
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          <DialogFooter className="flex-wrap gap-2 sm:justify-between">
            <div className="flex flex-wrap gap-2">
              <Button type="submit" name="accion" value="regresar" variant="outline" disabled={pending}>
                Regresar al clasificador
              </Button>
              <Button type="submit" name="accion" value="solicitar_info" variant="outline" disabled={pending}>
                Solicitar más información
              </Button>
            </div>
            <Button type="submit" name="accion" value="confirmar" disabled={pending}>
              {pending ? "Guardando..." : "Confirmar fracción"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
