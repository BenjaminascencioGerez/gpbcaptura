"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { toast } from "sonner";
import { requestOfficeUploadSlot, confirmOfficeUpload } from "./actions";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { PartidaAttachment } from "@/lib/types";

export function PartidaLinkDialog({
  previoId,
  partidaId,
  token,
  noPartida,
  attachments,
  readOnly,
  trigger,
}: {
  previoId: string;
  partidaId: string;
  token: string;
  noPartida: number;
  attachments: PartidaAttachment[];
  readOnly: boolean;
  trigger: React.ReactNode;
}) {
  const [qr, setQr] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleUpload() {
    const files = Array.from(fileInputRef.current?.files ?? []);
    if (files.length === 0) {
      setError("Selecciona al menos un archivo.");
      return;
    }
    setPending(true);
    setError("");
    const supabase = createClient();

    for (const file of files) {
      const slot = await requestOfficeUploadSlot(previoId, partidaId, file.name);
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
      const confirm = await confirmOfficeUpload(previoId, partidaId, slot.path, fileType);
      if (confirm.error) {
        setError(confirm.error);
        setPending(false);
        return;
      }
    }
    setPending(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    toast.success("Adjunto(s) subido(s)");
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    const full = `${window.location.origin}/p/${token}`;
    setUrl(full);
    QRCode.toDataURL(full, { margin: 1, width: 220 }).then(setQr).catch(() => setQr(null));
  }, [token]);

  return (
    <Dialog>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className="sm:max-w-sm max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adjuntos — partida {noPartida}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-3">
          {qr && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr} alt="Código QR" className="rounded-lg border" width={220} height={220} />
          )}
          <p className="text-xs text-muted-foreground text-center break-all">{url}</p>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => {
              navigator.clipboard.writeText(url);
              toast.success("Link copiado");
            }}
          >
            Copiar link
          </Button>
        </div>

        <Separator />

        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Adjuntos ({attachments.length}):
          </p>
          {attachments.length === 0 && (
            <p className="text-sm text-muted-foreground">Sin adjuntos todavía.</p>
          )}
          <div className="grid grid-cols-3 gap-2">
            {attachments.map((a) => (
              <a key={a.id} href={a.file_url} target="_blank" rel="noreferrer">
                {a.file_type === "photo" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.file_url} alt="" className="aspect-square w-full rounded-lg border object-cover" />
                ) : (
                  <div className="flex aspect-square items-center justify-center rounded-lg border bg-muted text-xs text-muted-foreground p-1 text-center">
                    Documento
                  </div>
                )}
              </a>
            ))}
          </div>
        </div>

        {!readOnly && (
          <div className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              multiple
              className="block w-full text-xs"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="w-full"
              disabled={pending}
              onClick={handleUpload}
            >
              {pending ? "Subiendo..." : "Subir desde aquí"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
