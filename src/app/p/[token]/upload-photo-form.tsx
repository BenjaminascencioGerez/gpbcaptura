"use client";

import { useActionState, useRef } from "react";
import { uploadPartidaPhoto } from "./actions";
import { Button } from "@/components/ui/button";

export function UploadPhotoForm({ token, hasPhoto }: { token: string; hasPhoto: boolean }) {
  const action = uploadPartidaPhoto.bind(null, token);
  const [state, formAction, pending] = useActionState(action, null);
  const formRef = useRef<HTMLFormElement>(null);

  if (state?.success) {
    return (
      <p className="text-sm font-medium text-center text-primary">
        Subido correctamente. Ya puedes cerrar esta página.
      </p>
    );
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <input
        type="file"
        name="file"
        accept="image/*,application/pdf"
        multiple
        required
        className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-2 file:text-sm file:font-medium"
      />
      <p className="text-xs text-muted-foreground">
        Puedes tomar una foto con la cámara o elegir varias fotos/documentos a la vez.
      </p>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Subiendo..." : hasPhoto ? "Agregar más" : "Subir"}
      </Button>
    </form>
  );
}
