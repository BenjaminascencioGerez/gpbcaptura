"use client";

import { useActionState } from "react";
import { createPrevioManual, importPrevioExcel } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function NewPrevioPage() {
  const [manualState, manualAction, manualPending] = useActionState(createPrevioManual, null);
  const [importState, importAction, importPending] = useActionState(importPrevioExcel, null);

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-2xl font-semibold">Nuevo previo</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Importar desde Excel</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={importAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="file">Reporte de Previo para Importación (.xlsx)</Label>
              <Input id="file" name="file" type="file" accept=".xlsx" required />
              <p className="text-xs text-muted-foreground">
                Se leen el encabezado (referencia, cliente, fecha, peso bruto) y todas las partidas
                desde la fila 14 en adelante, con el mismo formato de celdas del reporte.
              </p>
            </div>
            {importState?.error && <p className="text-sm text-destructive">{importState.error}</p>}
            <Button type="submit" className="w-full" disabled={importPending}>
              {importPending ? "Importando..." : "Importar Excel"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground">o captura a mano</span>
        <Separator className="flex-1" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Captura manual</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={manualAction} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="reference">No. de Referencia (GBI)</Label>
                <Input id="reference" name="reference" required placeholder="GBI3543" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cliente">Cliente</Label>
                <Input id="cliente" name="cliente" placeholder="NFE" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fecha">Fecha</Label>
                <Input id="fecha" name="fecha" type="date" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="peso_bruto">Peso bruto (kg)</Label>
                <Input id="peso_bruto" name="peso_bruto" type="number" step="0.01" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bultos_tarimas">Tarimas</Label>
                <Input id="bultos_tarimas" name="bultos_tarimas" type="number" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bultos_cajas_madera">Cajas de madera</Label>
                <Input id="bultos_cajas_madera" name="bultos_cajas_madera" type="number" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bultos_otros">Otros</Label>
                <Input id="bultos_otros" name="bultos_otros" type="number" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bultos_otros_tipo">Tipo de &quot;Otros&quot;</Label>
              <Input id="bultos_otros_tipo" name="bultos_otros_tipo" />
            </div>
            {manualState?.error && <p className="text-sm text-destructive">{manualState.error}</p>}
            <Button type="submit" variant="outline" className="w-full" disabled={manualPending}>
              {manualPending ? "Creando..." : "Crear previo vacío"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
