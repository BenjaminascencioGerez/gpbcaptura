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
        Foto subida correctamente. Ya puedes cerrar esta página.
      </p>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="space-y-3"
    >
      <input
        type="file"
        name="file"
        accept="image/*"
        capture="environment"
        required
        className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-2 file:text-sm file:font-medium"
      />
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Subiendo..." : hasPhoto ? "Reemplazar foto" : "Subir foto"}
      </Button>
    </form>
  );
}
