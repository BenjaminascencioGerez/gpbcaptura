"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function PartidaLinkDialog({
  token,
  noPartida,
  trigger,
}: {
  token: string;
  noPartida: number;
  trigger: React.ReactNode;
}) {
  const [qr, setQr] = useState<string | null>(null);
  const [url, setUrl] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const full = `${window.location.origin}/p/${token}`;
    setUrl(full);
    QRCode.toDataURL(full, { margin: 1, width: 240 }).then(setQr).catch(() => setQr(null));
  }, [token]);

  return (
    <Dialog>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Foto — partida {noPartida}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4">
          {qr && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr} alt="Código QR" className="rounded-lg border" width={240} height={240} />
          )}
          <p className="text-xs text-muted-foreground text-center break-all">{url}</p>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              navigator.clipboard.writeText(url);
              toast.success("Link copiado");
            }}
          >
            Copiar link
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
