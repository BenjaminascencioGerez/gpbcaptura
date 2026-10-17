"use client";

import { useRef, useState } from "react";
import { requestPublicUploadSlot, confirmPublicUpload } from "./actions";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function UploadPhotoForm({ token, hasPhoto }: { token: string; hasPhoto: boolean }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleUpload() {
    const files = Array.from(inputRef.current?.files ?? []);
    if (files.length === 0) {
      setError("Selecciona o toma al menos una foto.");
      return;
    }

    setPending(true);
    setError("");
    const supabase = createClient();

    for (const file of files) {
      const slot = await requestPublicUploadSlot(token, file.name);
      if (slot.error || !slot.path || !slot.token) {
        setError(slot.error || "No se pudo preparar la subida.");
        setPending(false);
        return;
      }

      const { error: uploadError } = await supabase.storage
        .from("partida-photos")
        .uploadToSignedUrl(slot.path, slot.token, file);

      if (uploadError) {
        setError(`No se pudo subir "${file.name}": ${uploadError.message}`);
        setPending(false);
        return;
      }

      const fileType = file.type.startsWith("image/") ? "photo" : "document";
      const confirm = await confirmPublicUpload(token, slot.path, fileType);
      if (confirm.error) {
        setError(confirm.error);
        setPending(false);
        return;
      }
    }

    setPending(false);
    setSuccess(true);
  }

  if (success) {
    return (
      <p className="text-sm font-medium text-center text-primary">
        Subido correctamente. Ya puedes cerrar esta página.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        multiple
        required
        className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-2 file:text-sm file:font-medium"
      />
      <p className="text-xs text-muted-foreground">
        Puedes tomar una foto con la cámara o elegir varias fotos/documentos a la vez.
      </p>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="button" className="w-full" disabled={pending} onClick={handleUpload}>
        {pending ? "Subiendo..." : hasPhoto ? "Agregar más" : "Subir"}
      </Button>
    </div>
  );
}
