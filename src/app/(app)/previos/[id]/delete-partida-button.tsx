"use client";

import { useTransition } from "react";
import { Trash2Icon } from "lucide-react";
import { deletePartida } from "./actions";
import { Button } from "@/components/ui/button";

export function DeletePartidaButton({ previoId, partidaId }: { previoId: string; partidaId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      disabled={pending}
      onClick={() => {
        if (!confirm("¿Eliminar esta partida?")) return;
        startTransition(() => deletePartida(previoId, partidaId));
      }}
    >
      <Trash2Icon className="size-4" />
      <span className="sr-only">Eliminar</span>
    </Button>
  );
}
