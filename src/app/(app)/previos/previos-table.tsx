import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { ESTADO_LABELS, ETAPA_LABELS, totalBultos, type Etapa } from "@/lib/previo-progreso";
import { cargarProgreso } from "@/lib/previo-progreso-server";
import { EstadoButton } from "./estado-button";

export type FiltrosPrevios = { cliente?: string; revisor?: string; etapa?: string; q?: string };

const SIN_CLIENTE = "Sin cliente";
const SIN_REVISOR = "Sin revisor";

// Lee los filtros de la URL (?cliente=&revisor=&etapa=&q=).
export function leerFiltros(params: { [key: string]: string | string[] | undefined }): FiltrosPrevios {
  const v = (k: string) => (typeof params[k] === "string" ? (params[k] as string) : "");
  return { cliente: v("cliente"), revisor: v("revisor"), etapa: v("etapa"), q: v("q") };
}

export async function PreviosTable({
  estado,
  readOnly,
  emptyMessage,
  basePath,
  filtros = {},
}: {
  estado: Previo["estado"];
  readOnly: boolean;
  emptyMessage: string;
  basePath: string;
  filtros?: FiltrosPrevios;
}) {
  const supabase = await createClient();
  const { data: previos } = await supabase
    .from("previos")
    .select("*")
    .eq("estado", estado)
    .order(estado === "importado" ? "importado_at" : "created_at", { ascending: false })
    .returns<Previo[]>();

  const todos = previos ?? [];
  const progreso = await cargarProgreso(supabase, todos);

  const clienteDe = (p: Previo) => p.cliente?.trim() || SIN_CLIENTE;
  const revisorDe = (p: Previo) => p.revisor?.trim() || SIN_REVISOR;
  const opcionesCliente = [...new Set(todos.map(clienteDe))].sort();
  const opcionesRevisor = [...new Set(todos.map(revisorDe))].sort();
  const opcionesEtapa = [...new Set(todos.map((p) => progreso.get(p.id)!.etapa))] as Etapa[];

  const q = (filtros.q ?? "").trim().toUpperCase();
  const rows = todos.filter(
    (p) =>
      (!filtros.cliente || clienteDe(p) === filtros.cliente) &&
      (!filtros.revisor || revisorDe(p) === filtros.revisor) &&
      (!filtros.etapa || progreso.get(p.id)!.etapa === filtros.etapa) &&
      (!q || p.reference.toUpperCase().includes(q) || (p.referencia_cliente ?? "").toUpperCase().includes(q))
  );
  const hayFiltros = Boolean(filtros.cliente || filtros.revisor || filtros.etapa || q);
  const selectClass =
    "h-9 rounded-md border border-input bg-background px-2 text-sm min-w-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <Card>
      <CardHeader>
        <form method="get" action={basePath} className="flex flex-wrap items-end gap-3">
          <label className="space-y-1 text-xs text-muted-foreground">
            <span className="block">Cliente</span>
            <select name="cliente" defaultValue={filtros.cliente ?? ""} className={selectClass}>
              <option value="">Todos</option>
              {opcionesCliente.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-xs text-muted-foreground">
            <span className="block">Revisor</span>
            <select name="revisor" defaultValue={filtros.revisor ?? ""} className={selectClass}>
              <option value="">Todos</option>
              {opcionesRevisor.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-xs text-muted-foreground">
            <span className="block">Etapa</span>
            <select name="etapa" defaultValue={filtros.etapa ?? ""} className={selectClass}>
              <option value="">Todas</option>
              {opcionesEtapa.map((e) => (
                <option key={e} value={e}>
                  {ETAPA_LABELS[e]}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-xs text-muted-foreground">
            <span className="block">Referencia</span>
            <Input name="q" defaultValue={filtros.q ?? ""} placeholder="GER / GW / GBI" className="h-9 w-40" />
          </label>
          <Button type="submit" size="sm">
            Filtrar
          </Button>
          {hayFiltros && (
            <Button variant="ghost" size="sm" nativeButton={false} render={<Link href={basePath} />}>
              Limpiar
            </Button>
          )}
          <span className="ml-auto text-sm text-muted-foreground">
            {rows.length}
            {hayFiltros ? ` de ${todos.length}` : ""} previos
          </span>
        </form>
      </CardHeader>
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
                  {hayFiltros ? "Ningún previo con esos filtros." : emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
