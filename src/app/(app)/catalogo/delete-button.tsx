"use client";

import { useTransition } from "react";
import { Trash2Icon } from "lucide-react";
import { deleteClasificacion } from "./actions";
import { Button } from "@/components/ui/button";

export function DeleteClasificacionButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      disabled={pending}
      onClick={() => {
        if (!confirm("¿Eliminar esta clasificación del catálogo?")) return;
        startTransition(() => deleteClasificacion(id));
      }}
    >
      <Trash2Icon className="size-4" />
      <span className="sr-only">Eliminar</span>
    </Button>
  );
}
