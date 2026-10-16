"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { updatePrevioHeader } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Previo } from "@/lib/types";

export function PrevioHeaderForm({ previo, readOnly }: { previo: Previo; readOnly?: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(formData) =>
        startTransition(async () => {
          await updatePrevioHeader(previo.id, formData);
          toast.success("Encabezado actualizado");
        })
      }
      className="grid grid-cols-2 sm:grid-cols-4 gap-4"
    >
      <div className="space-y-1.5">
        <Label htmlFor="reference">No. de Referencia (GBI)</Label>
        <Input id="reference" name="reference" defaultValue={previo.reference} required disabled={readOnly} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="cliente">Cliente</Label>
        <Input id="cliente" name="cliente" defaultValue={previo.cliente ?? ""} disabled={readOnly} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="fecha">Fecha</Label>
        <Input id="fecha" name="fecha" type="date" defaultValue={previo.fecha} disabled={readOnly} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="peso_bruto">Peso bruto (kg)</Label>
        <Input
          id="peso_bruto"
          name="peso_bruto"
          type="number"
          step="0.01"
          defaultValue={previo.peso_bruto ?? ""}
          disabled={readOnly}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="bultos_tarimas">Tarimas</Label>
        <Input id="bultos_tarimas" name="bultos_tarimas" type="number" defaultValue={previo.bultos_tarimas ?? ""} disabled={readOnly} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="bultos_cajas_madera">Cajas de madera</Label>
        <Input
          id="bultos_cajas_madera"
          name="bultos_cajas_madera"
          type="number"
          defaultValue={previo.bultos_cajas_madera ?? ""}
          disabled={readOnly}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="bultos_otros">Otros</Label>
        <Input id="bultos_otros" name="bultos_otros" type="number" defaultValue={previo.bultos_otros ?? ""} disabled={readOnly} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="bultos_otros_tipo">Tipo de &quot;Otros&quot;</Label>
        <Input id="bultos_otros_tipo" name="bultos_otros_tipo" defaultValue={previo.bultos_otros_tipo ?? ""} disabled={readOnly} />
      </div>
      {!readOnly && (
        <div className="col-span-full">
          <Button type="submit" variant="outline" size="sm" disabled={pending}>
            {pending ? "Guardando..." : "Guardar encabezado"}
          </Button>
        </div>
      )}
    </form>
  );
}
