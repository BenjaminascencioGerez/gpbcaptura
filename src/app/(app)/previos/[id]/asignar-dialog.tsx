"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { UsuarioAsignable } from "@/lib/usuarios-server";
import { enviarAClasificacion, enviarAGlosa, enviarAGlosaFinal } from "./actions";

// "Enviar a clasificación" / "Enviar a glosa": elige a la persona y asigna el previo.
export function AsignarDialog({
  previoId,
  tipo,
  usuarios,
  asignadoId,
  aviso,
  trigger,
}: {
  previoId: string;
  tipo: "clasificacion" | "glosa" | "glosa_final";
  usuarios: UsuarioAsignable[];
  asignadoId: string | null;
  aviso?: string;
  trigger: React.ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const [usuarioId, setUsuarioId] = useState(asignadoId ?? "");
  const [pending, startTransition] = useTransition();
  const etiqueta =
    tipo === "clasificacion"
      ? "clasificador"
      : tipo === "glosa"
        ? "responsable de confirmar las fracciones"
        : "glosador";
  const titulo =
    tipo === "clasificacion" ? "Enviar a clasificación" : tipo === "glosa" ? "Enviar fracciones" : "Enviar a glosa";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>
            {asignadoId
              ? `Cambia el ${etiqueta} asignado a este previo.`
              : `Elige el ${etiqueta} que va a trabajar este previo. Le llegará un aviso.`}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor={`usuario-${tipo}`}>
            {tipo === "clasificacion" ? "Clasificador" : tipo === "glosa" ? "Quién confirma las fracciones" : "Glosador"}
          </Label>
          {usuarios.length === 0 ? (
            <p className="text-sm text-destructive">
              No hay usuarios con rol de {tipo === "glosa_final" ? "Glosador" : "Clasificador"}. Un Administrador lo
              asigna en Usuarios.
            </p>
          ) : (
            <select
              id={`usuario-${tipo}`}
              value={usuarioId}
              onChange={(e) => setUsuarioId(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Seleccionar…</option>
              {usuarios.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre} {u.email && u.email !== u.nombre ? `(${u.email})` : ""}
                </option>
              ))}
            </select>
          )}
          {aviso && <p className="text-xs text-amber-700">{aviso}</p>}
        </div>
        <DialogFooter>
          <Button
            disabled={!usuarioId || pending}
            onClick={() =>
              startTransition(async () => {
                const res =
                  tipo === "clasificacion"
                    ? await enviarAClasificacion(previoId, usuarioId)
                    : tipo === "glosa"
                      ? await enviarAGlosa(previoId, usuarioId)
                      : await enviarAGlosaFinal(previoId, usuarioId);
                if (res.error) toast.error(res.error);
                else {
                  toast.success(
                    tipo === "clasificacion"
                      ? "Enviado a clasificación"
                      : tipo === "glosa"
                        ? "Fracciones enviadas"
                        : "Enviado a glosa"
                  );
                  setOpen(false);
                }
              })
            }
          >
            {pending ? "Enviando..." : asignadoId ? "Reasignar" : "Enviar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
