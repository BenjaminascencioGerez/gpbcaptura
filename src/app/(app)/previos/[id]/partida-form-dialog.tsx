"use client";

import { useActionState, useEffect, useState } from "react";
import { addPartida, updatePartida } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

const FIELDS: { name: keyof Partida; label: string; span?: 1 | 2 }[] = [
  { name: "no_partida", label: "No. Partida" },
  { name: "cant_factura", label: "Cant. Factura" },
  { name: "um_comercial", label: "UM Comercial" },
  { name: "marca", label: "Marca" },
  { name: "modelo", label: "Modelo" },
  { name: "submodelo", label: "SubModelo" },
  { name: "numserie", label: "NumSerie" },
  { name: "pais_origen", label: "País de Origen" },
  { name: "peso", label: "Peso" },
  { name: "kilos_por_pieza", label: "Kilos por pieza" },
  { name: "umt", label: "UMT (unidad de tasación)" },
  { name: "precio_unitario", label: "Precio Unitario" },
  { name: "total", label: "Total" },
  { name: "id_cat_no_art_no", label: "ID / CAT. NO. / ART. NO." },
];

const NUMERIC_FIELDS = new Set(["no_partida", "cant_factura", "peso", "kilos_por_pieza", "precio_unitario", "total"]);

export function PartidaFormDialog({
  previoId,
  partida,
  nextNoPartida,
  trigger,
}: {
  previoId: string;
  partida?: Partida;
  nextNoPartida?: number;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const action = partida
    ? updatePartida.bind(null, previoId, partida.id)
    : addPartida.bind(null, previoId);
  const [state, formAction, pending] = useActionState(action, null);

  useEffect(() => {
    if (state && !state.error) setOpen(false);
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{partida ? `Editar partida ${partida.no_partida}` : "Nueva partida"}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {FIELDS.map((f) => (
              <div key={f.name} className="space-y-1.5">
                <Label htmlFor={f.name}>{f.label}</Label>
                <Input
                  id={f.name}
                  name={f.name}
                  type={NUMERIC_FIELDS.has(f.name) ? "number" : "text"}
                  step={NUMERIC_FIELDS.has(f.name) ? "any" : undefined}
                  defaultValue={
                    f.name === "no_partida"
                      ? String(partida?.no_partida ?? nextNoPartida ?? 1)
                      : (partida?.[f.name] as string | number | null | undefined) ?? ""
                  }
                />
              </div>
            ))}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="descripcion_aa">Descripción AA</Label>
            <Textarea
              id="descripcion_aa"
              name="descripcion_aa"
              rows={2}
              defaultValue={partida?.descripcion_aa ?? ""}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="observaciones">Observaciones</Label>
            <Textarea
              id="observaciones"
              name="observaciones"
              rows={2}
              defaultValue={partida?.observaciones ?? ""}
            />
          </div>
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
