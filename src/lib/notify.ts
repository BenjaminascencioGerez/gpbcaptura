import { createAdminClient } from "@/lib/supabase/admin";

type NotifyEvent = {
  eventType:
    | "partida_clasificada"
    | "previo_enviado_facturacion"
    | "partida_glosada"
    | "previo_enviado_clasificacion"
    | "previo_enviado_glosa"
    | "partida_info_solicitada"
    | "partida_devuelta"
    | "previo_enviado_documentacion";
  previoId: string;
  partidaId?: string;
  payload: Record<string, unknown>;
};

// Registra el evento siempre (histórico/auditoría), y si hay un proveedor de correo
// configurado (RESEND_API_KEY + RESEND_FROM), manda el correo a todos los Ejecutivos.
// Si no hay proveedor configurado, el evento queda pendiente en notification_events
// para que se pueda reenviar cuando se conecte uno.
export async function notifyEjecutivos(event: NotifyEvent) {
  const admin = createAdminClient();
  const { data: ejecutivoRoles } = await admin.from("user_roles").select("user_id").eq("role", "ejecutivo");
  await notifyUsuarios(event, (ejecutivoRoles ?? []).map((r) => r.user_id));
}

// Igual que notifyEjecutivos, pero a usuarios específicos (p. ej. el clasificador asignado).
export async function notifyUsuarios(event: NotifyEvent, userIds: string[]) {
  const admin = createAdminClient();

  const { data: inserted } = await admin
    .from("notification_events")
    .insert({
      event_type: event.eventType,
      previo_id: event.previoId,
      partida_id: event.partidaId ?? null,
      payload: event.payload,
    })
    .select("id")
    .single();

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!apiKey || !from || !inserted) return;

  if (userIds.length === 0) return;

  const emails: string[] = [];
  for (const userId of userIds) {
    const { data } = await admin.auth.admin.getUserById(userId);
    if (data.user?.email) emails.push(data.user.email);
  }
  if (emails.length === 0) return;

  const subject = subjectFor(event);
  const text = textFor(event);

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: emails, subject, text }),
  });

  if (res.ok) {
    await admin.from("notification_events").update({ sent_at: new Date().toISOString() }).eq("id", inserted.id);
  }
}

function subjectFor(event: NotifyEvent): string {
  switch (event.eventType) {
    case "partida_clasificada":
      return `Partida clasificada — ${event.payload.reference ?? ""}`;
    case "partida_glosada":
      return `Partida glosada — ${event.payload.reference ?? ""}`;
    case "previo_enviado_facturacion":
      return `Previo enviado a facturación — ${event.payload.reference ?? ""}`;
    case "previo_enviado_clasificacion":
      return `Previo asignado para clasificación — ${event.payload.reference ?? ""}`;
    case "previo_enviado_glosa":
      return `Fracciones por confirmar — ${event.payload.reference ?? ""}`;
    case "partida_info_solicitada":
      return `Se solicita más información — ${event.payload.reference ?? ""} partida ${event.payload.partida ?? ""}`;
    case "partida_devuelta":
      return `Partida regresada a clasificación — ${event.payload.reference ?? ""} partida ${event.payload.partida ?? ""}`;
    case "previo_enviado_documentacion":
      return `Previo listo para documentación — ${event.payload.reference ?? ""}`;
  }
}

function textFor(event: NotifyEvent): string {
  const lines = Object.entries(event.payload).map(([k, v]) => `${k}: ${v}`);
  return lines.join("\n");
}
