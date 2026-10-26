"use client";

import { useActionState, useEffect, useState } from "react";
import { addPartida, updatePartida } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { UM_COMERCIAL_OPTIONS } from "@/lib/um-comercial";
import { PAISES } from "@/lib/paises";
import type { Partida } from "@/lib/types";
import { etiquetaPartida } from "@/lib/partida";

const FIELDS: { name: keyof Partida; label: string; span?: 1 | 2 }[] = [
  { name: "no_partida", label: "No. Partida" },
  { name: "cant_factura", label: "Cant. Factura" },
  { name: "marca", label: "Marca" },
  { name: "modelo", label: "Modelo" },
  { name: "submodelo", label: "SubModelo" },
  { name: "numserie", label: "NumSerie" },
  { name: "peso", label: "Peso" },
  { name: "kilos_por_pieza", label: "Kilos por pieza" },
  { name: "precio_unitario", label: "Precio Unitario" },
  { name: "total", label: "Total" },
  { name: "id_cat_no_art_no", label: "ID / CAT. NO. / ART. NO." },
];

const NUMERIC_FIELDS = new Set(["no_partida", "cant_factura", "peso", "kilos_por_pieza", "precio_unitario", "total"]);

export function PartidaFormDialog({
  previoId,
  partida,
  nextNoPartida,
  facturas = [],
  trigger,
}: {
  previoId: string;
  partida?: Partida;
  nextNoPartida?: number;
  facturas?: string[];
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [umComercial, setUmComercial] = useState(partida?.um_comercial ?? "");
  const [paisOrigen, setPaisOrigen] = useState(partida?.pais_origen ?? "");
  const action = partida
    ? updatePartida.bind(null, previoId, partida.id)
    : addPartida.bind(null, previoId);
  const [state, formAction, pending] = useActionState(action, null);
  const umComercialItems = Object.fromEntries(UM_COMERCIAL_OPTIONS.map((u) => [u, u]));
  const paisItems = Object.fromEntries(PAISES.map((p) => [p.clave, `${p.clave} — ${p.nombre}`]));

  useEffect(() => {
    if (state && !state.error) setOpen(false);
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{partida ? `Editar partida ${etiquetaPartida(partida)}` : "Nueva partida"}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="factura">Factura</Label>
              <Input
                id="factura"
                name="factura"
                list={`facturas-${previoId}`}
                placeholder={facturas.length > 0 ? "Elegir o escribir" : "Opcional"}
                defaultValue={partida ? (partida.factura ?? "") : facturas.length === 1 ? facturas[0] : ""}
              />
              <datalist id={`facturas-${previoId}`}>
                {facturas.map((f) => (
                  <option key={f} value={f} />
                ))}
              </datalist>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="um_comercial">UM Comercial</Label>
              <input type="hidden" name="um_comercial" value={umComercial} />
              <Select items={umComercialItems} value={umComercial} onValueChange={(v) => v && setUmComercial(v)}>
                <SelectTrigger id="um_comercial" className="w-full">
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  {UM_COMERCIAL_OPTIONS.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pais_origen">País de Origen</Label>
              <input type="hidden" name="pais_origen" value={paisOrigen} />
              <Select items={paisItems} value={paisOrigen} onValueChange={(v) => v && setPaisOrigen(v)}>
                <SelectTrigger id="pais_origen" className="w-full">
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  {PAISES.map((p) => (
                    <SelectItem key={p.clave} value={p.clave}>
                      {p.clave} — {p.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
                      ? partida
                        ? (partida.no_partida ?? "")
                        : String(nextNoPartida ?? 1)
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
