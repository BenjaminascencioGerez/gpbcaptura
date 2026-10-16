"use client";

import { useActionState } from "react";
import { addClasificacion } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function NewClasificacionForm() {
  const [state, formAction, pending] = useActionState(addClasificacion, null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Agregar al catálogo</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="grid grid-cols-2 sm:grid-cols-5 gap-3 items-end">
          <div className="space-y-1.5">
            <Label htmlFor="cliente">Cliente</Label>
            <Input id="cliente" name="cliente" required placeholder="NFE" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fraccion_arancelaria">Fracción</Label>
            <Input id="fraccion_arancelaria" name="fraccion_arancelaria" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nico">NICO</Label>
            <Input id="nico" name="nico" />
          </div>
          <div className="space-y-1.5 col-span-2 sm:col-span-1">
            <Label htmlFor="descripcion">Descripción</Label>
            <Input id="descripcion" name="descripcion" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="regulaciones">Regulaciones / NOM</Label>
            <Input id="regulaciones" name="regulaciones" placeholder="NOM-004-SCFI" />
          </div>
          <div className="col-span-full flex items-center gap-3">
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Guardando..." : "Agregar"}
            </Button>
            {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
