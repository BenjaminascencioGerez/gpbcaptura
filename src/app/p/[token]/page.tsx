import Image from "next/image";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UploadPhotoForm } from "./upload-photo-form";

export default async function PartidaPhotoPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: partida } = await admin
    .from("partidas")
    .select("*, previos(reference, cliente)")
    .eq("photo_token", token)
    .single();

  if (!partida) notFound();

  const previo = partida.previos as unknown as { reference: string; cliente: string | null } | null;

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-muted/30">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center gap-2">
          <Image src="/gpb-logo.png" alt="GPB Forwarding LLC." width={200} height={67} priority />
          <CardTitle className="text-base font-normal text-muted-foreground">
            Foto de mercancía
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="rounded-lg border bg-background p-4 text-sm space-y-1">
            <p>
              <span className="text-muted-foreground">Referencia: </span>
              {previo?.reference ?? "—"}
              {previo?.cliente ? ` · ${previo.cliente}` : ""}
            </p>
            <p>
              <span className="text-muted-foreground">Partida: </span>
              {partida.no_partida}
            </p>
            {partida.descripcion_aa && (
              <p>
                <span className="text-muted-foreground">Descripción: </span>
                {partida.descripcion_aa}
              </p>
            )}
            {(partida.marca || partida.modelo) && (
              <p>
                <span className="text-muted-foreground">Marca / Modelo: </span>
                {[partida.marca, partida.modelo].filter(Boolean).join(" / ")}
              </p>
            )}
          </div>

          {partida.photo_url && (
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">Foto actual:</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={partida.photo_url}
                alt={`Foto partida ${partida.no_partida}`}
                className="w-full rounded-lg border object-cover"
              />
            </div>
          )}

          <UploadPhotoForm token={token} hasPhoto={!!partida.photo_url} />
        </CardContent>
      </Card>
    </div>
  );
}
