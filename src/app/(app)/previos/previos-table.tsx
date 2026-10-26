import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Previo } from "@/lib/types";
import { ESTADO_LABELS, ETAPA_LABELS, totalBultos } from "@/lib/previo-progreso";
import { cargarProgreso } from "@/lib/previo-progreso-server";
import { EstadoButton } from "./estado-button";

export async function PreviosTable({
  estado,
  readOnly,
  emptyMessage,
}: {
  estado: Previo["estado"];
  readOnly: boolean;
  emptyMessage: string;
}) {
  const supabase = await createClient();
  const { data: previos } = await supabase
    .from("previos")
    .select("*")
    .eq("estado", estado)
    .order(estado === "importado" ? "importado_at" : "created_at", { ascending: false })
    .returns<Previo[]>();

  const rows = previos ?? [];
  const progreso = await cargarProgreso(supabase, rows);

  return (
    <Card>
      <CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Referencia GER/GW</TableHead>
              <TableHead>GBI / TOIM / TPIM</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead>Fecha de arribo</TableHead>
              <TableHead>Fecha de revisión</TableHead>
              <TableHead>Revisor</TableHead>
              <TableHead>Recibido por</TableHead>
              <TableHead>Bultos</TableHead>
              <TableHead>Peso</TableHead>
              <TableHead>Avance</TableHead>
              <TableHead>Etapa</TableHead>
              <TableHead>Estado</TableHead>
              {!readOnly && <TableHead />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((p) => {
              const prog = progreso.get(p.id)!;
              return (
                <TableRow key={p.id}>
                  <TableCell>
                    <Link href={`/previos/${p.id}`} className="font-medium hover:underline">
                      {p.reference}
                    </Link>
                  </TableCell>
                  <TableCell>{p.referencia_cliente ?? "—"}</TableCell>
                  <TableCell>{p.cliente ?? "—"}</TableCell>
                  <TableCell>{p.proveedor ?? "—"}</TableCell>
                  <TableCell>{p.fecha_arribo ?? "—"}</TableCell>
                  <TableCell>{p.fecha_revision ?? "—"}</TableCell>
                  <TableCell>{p.revisor ?? "—"}</TableCell>
                  <TableCell>{p.recibido_por ?? "—"}</TableCell>
                  <TableCell>{totalBultos(p)}</TableCell>
                  <TableCell>{p.peso_bruto ? `${p.peso_bruto} kg` : "—"}</TableCell>
                  <TableCell title={`${prog.capturadas} de ${prog.total} partidas capturadas`}>
                    <div className="flex items-center gap-2 min-w-24">
                      <div className="h-1.5 flex-1 rounded-full bg-muted">
                        <div className="h-1.5 rounded-full bg-primary" style={{ width: `${prog.avance}%` }} />
                      </div>
                      <span className="text-xs tabular-nums">{prog.avance}%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{ETAPA_LABELS[prog.etapa]}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={p.estado === "importado" ? "default" : "secondary"}>
                      {ESTADO_LABELS[p.estado]}
                    </Badge>
                  </TableCell>
                  {!readOnly && (
                    <TableCell>
                      <EstadoButton previoId={p.id} estado={p.estado} reference={p.reference} />
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={14} className="text-center text-muted-foreground py-8">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
