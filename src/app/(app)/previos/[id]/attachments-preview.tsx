import type { PartidaAttachment } from "@/lib/types";

export function AttachmentsPreview({ attachments }: { attachments: PartidaAttachment[] }) {
  if (attachments.length === 0) {
    return <p className="text-xs text-muted-foreground">Sin fotos ni documentos adjuntos todavía.</p>;
  }

  const photos = attachments.filter((a) => a.file_type === "photo");
  const docs = attachments.filter((a) => a.file_type === "document");

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Fotos y adjuntos ({attachments.length}) — para ayudarte a identificar el producto:
      </p>
      <div className="grid grid-cols-4 gap-2">
        {photos.map((a) => (
          <a key={a.id} href={a.file_url} target="_blank" rel="noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={a.file_url}
              alt="Foto de la partida"
              className="aspect-square w-full rounded-lg border object-cover"
            />
          </a>
        ))}
        {docs.map((a) => (
          <a
            key={a.id}
            href={a.file_url}
            target="_blank"
            rel="noreferrer"
            className="flex aspect-square items-center justify-center rounded-lg border bg-muted text-xs text-muted-foreground p-1 text-center hover:bg-muted/70"
          >
            Documento
          </a>
        ))}
      </div>
    </div>
  );
}
