import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Previo } from "@/lib/types";
import { ETAPA_LABELS, type Etapa } from "@/lib/previo-progreso";
import { cargarProgreso } from "@/lib/previo-progreso-server";

// A partir de cuántos días en bodega un previo se marca como atorado.
const DIAS_ATORADO = 7;

const ETAPAS_PENDIENTES: Etapa[] = ["revision_fisica", "clasificacion", "glosa", "documentacion", "glosa_final", "glosado"];
const ETAPA_COLOR: Record<Etapa, string> = {
  revision_fisica: "bg-amber-500",
  clasificacion: "bg-sky-500",
  glosa: "bg-violet-500",
  documentacion: "bg-teal-500",
  glosa_final: "bg-rose-500",
  glosado: "bg-lime-500",
  enviado_facturacion: "bg-emerald-500",
};

const SIN_CLIENTE = "Sin cliente";
const SIN_REVISOR = "Sin revisor";
const SIN_ASIGNAR = "Sin asignar";

function diasEnBodega(p: Previo, hoy: Date): number | null {
  const desde = p.fecha_arribo ?? p.fecha;
  if (!desde) return null;
  const ms = hoy.getTime() - new Date(`${desde}T00:00:00`).getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const filtro = (k: string) => (typeof params[k] === "string" ? (params[k] as string) : "");
  const fCliente = filtro("cliente");
  const fRevisor = filtro("revisor");
  const fAsignado = filtro("asignado");
  const fEtapa = filtro("etapa");
  const fQ = filtro("q").trim().toUpperCase();

  const supabase = await createClient();
  const hoy = new Date();
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString();

  const [{ data: enBodegaData }, { count: importadosMes }] = await Promise.all([
    supabase.from("previos").select("*").eq("estado", "en_bodega").returns<Previo[]>(),
    supabase
      .from("previos")
      .select("id", { count: "exact", head: true })
      .eq("estado", "importado")
      .gte("importado_at", inicioMes),
  ]);

  const enBodega = enBodegaData ?? [];
  const progreso = await cargarProgreso(supabase, enBodega);

  const filas = enBodega
    .map((p) => {
      const prog = progreso.get(p.id)!;
      // Quién lo tiene ahora: el clasificador o el glosador asignado, según su etapa.
      const asignado =
        prog.etapa === "clasificacion"
          ? p.clasificador_nombre?.trim() || SIN_ASIGNAR
          : prog.etapa === "glosa"
            ? p.glosador_nombre?.trim() || SIN_ASIGNAR
            : prog.etapa === "glosa_final"
              ? p.glosa_final_nombre?.trim() || SIN_ASIGNAR
              : null;
      return {
        previo: p,
        prog,
        dias: diasEnBodega(p, hoy),
        cliente: p.cliente?.trim() || SIN_CLIENTE,
        revisor: p.revisor?.trim() || SIN_REVISOR,
        asignado,
      };
    })
    .sort((a, b) => (b.dias ?? -1) - (a.dias ?? -1));

  const porEtapa = (e: Etapa) => filas.filter((f) => f.prog.etapa === e).length;
  const atorados = filas.filter((f) => (f.dias ?? 0) > DIAS_ATORADO).length;
  const sinAsignar = (e: Etapa) => filas.filter((f) => f.prog.etapa === e && f.asignado === SIN_ASIGNAR).length;
  const detalleAsignacion = (e: Etapa) =>
    porEtapa(e) === 0 ? "Ninguno" : sinAsignar(e) > 0 ? `${sinAsignar(e)} sin asignar` : "Todos asignados";

  // Carga de cada clasificador / glosador (previos que tiene pendientes).
  const personas = new Map<string, { clasificar: number; confirmar: number; glosar: number }>();
  for (const f of filas) {
    if (!f.asignado) continue;
    const c = personas.get(f.asignado) ?? { clasificar: 0, confirmar: 0, glosar: 0 };
    if (f.prog.etapa === "clasificacion") c.clasificar += 1;
    else if (f.prog.etapa === "glosa") c.confirmar += 1;
    else c.glosar += 1;
    personas.set(f.asignado, c);
  }
  const porPersona = [...personas.entries()]
    .map(([nombre, c]) => ({ nombre, ...c }))
    .sort((a, b) => (a.nombre === SIN_ASIGNAR ? -1 : b.nombre === SIN_ASIGNAR ? 1 : b.clasificar + b.confirmar + b.glosar - (a.clasificar + a.confirmar + a.glosar)));

  // Pendientes por cliente, desglosados por etapa.
  const clientes = new Map<string, Record<Etapa, number>>();
  for (const f of filas) {
    const c = clientes.get(f.cliente) ?? {
      revision_fisica: 0,
      clasificacion: 0,
      glosa: 0,
      documentacion: 0,
      glosa_final: 0,
      glosado: 0,
      enviado_facturacion: 0,
    };
    c[f.prog.etapa] += 1;
    clientes.set(f.cliente, c);
  }
  const porCliente = [...clientes.entries()]
    .map(([cliente, etapas]) => ({ cliente, etapas, total: ETAPAS_PENDIENTES.reduce((s, e) => s + etapas[e], 0) }))
    .sort((a, b) => b.total - a.total);
  const maxCliente = Math.max(1, ...porCliente.map((c) => c.total));

  const opcionesCliente = [...new Set(filas.map((f) => f.cliente))].sort();
  const opcionesRevisor = [...new Set(filas.map((f) => f.revisor))].sort();
  const opcionesAsignado = [...new Set(filas.map((f) => f.asignado).filter((a): a is string => Boolean(a)))].sort();

  const filtradas = filas.filter(
    (f) =>
      (!fCliente || f.cliente === fCliente) &&
      (!fRevisor || f.revisor === fRevisor) &&
      (!fAsignado || f.asignado === fAsignado) &&
      (!fEtapa || f.prog.etapa === fEtapa) &&
      (!fQ ||
        f.previo.reference.toUpperCase().includes(fQ) ||
        (f.previo.referencia_cliente ?? "").toUpperCase().includes(fQ))
  );
  const hayFiltros = Boolean(fCliente || fRevisor || fAsignado || fEtapa || fQ);

  const selectClass =
    "h-9 rounded-md border border-input bg-background px-2 text-sm min-w-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi titulo="Pendientes de revisar" valor={porEtapa("revision_fisica")} detalle="En revisión física" href="/dashboard?etapa=revision_fisica" />
        <Kpi
          titulo="Pendientes de clasificar"
          valor={porEtapa("clasificacion")}
          detalle={detalleAsignacion("clasificacion")}
          href="/dashboard?etapa=clasificacion"
          alerta={sinAsignar("clasificacion") > 0}
        />
        <Kpi
          titulo="Pendientes de confirmar fracciones"
          valor={porEtapa("glosa")}
          detalle={detalleAsignacion("glosa")}
          href="/dashboard?etapa=glosa"
          alerta={sinAsignar("glosa") > 0}
        />
        <Kpi
          titulo="En documentación"
          valor={porEtapa("documentacion")}
          detalle="Ejecutivos capturan el pedimento"
          href="/dashboard?etapa=documentacion"
        />
        <Kpi
          titulo="Pendientes de glosa"
          valor={porEtapa("glosa_final")}
          detalle={detalleAsignacion("glosa_final")}
          href="/dashboard?etapa=glosa_final"
          alerta={sinAsignar("glosa_final") > 0}
        />
        <Kpi
          titulo="Listos para facturar"
          valor={porEtapa("glosado")}
          detalle="Glosados"
          href="/dashboard?etapa=glosado"
        />
        <Kpi titulo="Pendientes de importar" valor={filas.length} detalle="Todos los que siguen en bodega" href="/previos" />
        <Kpi titulo="Importados este mes" valor={importadosMes ?? 0} detalle="Pasaron al historial" href="/historial" />
        <Kpi
          titulo={`Más de ${DIAS_ATORADO} días en bodega`}
          valor={atorados}
          detalle="Desde la fecha de arribo"
          alerta={atorados > 0}
        />
      </div>

      {porPersona.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pendientes por persona</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Persona</TableHead>
                  <TableHead className="text-right">Por clasificar</TableHead>
                  <TableHead className="text-right">Por confirmar</TableHead>
                  <TableHead className="text-right">Por glosar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {porPersona.map((p) => (
                  <TableRow key={p.nombre}>
                    <TableCell>
                      <Link
                        href={`/dashboard?asignado=${encodeURIComponent(p.nombre)}`}
                        className={`hover:underline ${p.nombre === SIN_ASIGNAR ? "font-medium text-destructive" : ""}`}
                      >
                        {p.nombre}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{p.clasificar || "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{p.confirmar || "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{p.glosar || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Previos pendientes por cliente</CardTitle>
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            {ETAPAS_PENDIENTES.map((e) => (
              <span key={e} className="flex items-center gap-1.5">
                <span className={`size-2.5 rounded-sm ${ETAPA_COLOR[e]}`} />
                {ETAPA_LABELS[e]}
              </span>
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {porCliente.length === 0 && <p className="text-sm text-muted-foreground">No hay previos en bodega.</p>}
          {porCliente.map((c) => (
            <Link
              key={c.cliente}
              href={`/dashboard?cliente=${encodeURIComponent(c.cliente)}`}
              className="grid grid-cols-[minmax(0,14rem)_1fr_2rem] items-center gap-3 rounded-md px-1 py-0.5 text-sm hover:bg-muted"
              title={ETAPAS_PENDIENTES.map((e) => `${ETAPA_LABELS[e]}: ${c.etapas[e]}`).join(" · ")}
            >
              <span className="truncate">{c.cliente}</span>
              <span className="flex h-3 overflow-hidden rounded-sm bg-muted">
                {ETAPAS_PENDIENTES.map((e) =>
                  c.etapas[e] > 0 ? (
                    <span key={e} className={ETAPA_COLOR[e]} style={{ width: `${(c.etapas[e] / maxCliente) * 100}%` }} />
                  ) : null
                )}
              </span>
              <span className="text-right tabular-nums">{c.total}</span>
            </Link>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-3">
          <CardTitle className="text-base">
            Pendientes ({filtradas.length}
            {hayFiltros ? ` de ${filas.length}` : ""})
          </CardTitle>
          <form method="get" className="flex flex-wrap items-end gap-3">
            <label className="space-y-1 text-xs text-muted-foreground">
              <span className="block">Cliente</span>
              <select name="cliente" defaultValue={fCliente} className={selectClass}>
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
              <select name="revisor" defaultValue={fRevisor} className={selectClass}>
                <option value="">Todos</option>
                {opcionesRevisor.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              <span className="block">Asignado a</span>
              <select name="asignado" defaultValue={fAsignado} className={selectClass}>
                <option value="">Todos</option>
                {opcionesAsignado.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              <span className="block">Etapa</span>
              <select name="etapa" defaultValue={fEtapa} className={selectClass}>
                <option value="">Todas</option>
                {ETAPAS_PENDIENTES.map((e) => (
                  <option key={e} value={e}>
                    {ETAPA_LABELS[e]}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              <span className="block">Referencia</span>
              <Input name="q" defaultValue={filtro("q")} placeholder="GER / GW / GBI" className="h-9 w-40" />
            </label>
            <Button type="submit" size="sm">
              Filtrar
            </Button>
            {hayFiltros && (
              <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/dashboard" />}>
                Limpiar
              </Button>
            )}
          </form>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Referencia</TableHead>
                <TableHead>GBI / TOIM / TPIM</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Revisor</TableHead>
                <TableHead>Asignado a</TableHead>
                <TableHead>Fecha de arribo</TableHead>
                <TableHead>Días en bodega</TableHead>
                <TableHead>Avance</TableHead>
                <TableHead>Etapa</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtradas.map(({ previo: p, prog, dias, cliente, revisor, asignado }) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <Link href={`/previos/${p.id}`} className="font-medium hover:underline">
                      {p.reference}
                    </Link>
                  </TableCell>
                  <TableCell>{p.referencia_cliente ?? "—"}</TableCell>
                  <TableCell>{cliente}</TableCell>
                  <TableCell className={revisor === SIN_REVISOR ? "text-muted-foreground" : undefined}>{revisor}</TableCell>
                  <TableCell>
                    {asignado === SIN_ASIGNAR ? <span className="text-destructive">{asignado}</span> : (asignado ?? "—")}
                  </TableCell>
                  <TableCell>{p.fecha_arribo ?? "—"}</TableCell>
                  <TableCell>
                    {dias === null ? (
                      "—"
                    ) : (
                      <span className={dias > DIAS_ATORADO ? "font-medium text-destructive" : undefined}>{dias}</span>
                    )}
                  </TableCell>
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
                    {prog.devueltas > 0 && (
                      <div className="mt-1 text-xs text-destructive">{prog.devueltas} regresada(s)</div>
                    )}
                    {prog.infoSolicitada > 0 && (
                      <div className="mt-1 text-xs text-amber-700">{prog.infoSolicitada} con info solicitada</div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {filtradas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    {hayFiltros ? "Ningún previo pendiente con esos filtros." : "No hay previos pendientes."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({
  titulo,
  valor,
  detalle,
  href,
  alerta,
}: {
  titulo: string;
  valor: number;
  detalle: string;
  href?: string;
  alerta?: boolean;
}) {
  const contenido = (
    <Card className={`h-full ${href ? "transition-colors hover:bg-muted/50" : ""}`}>
      <CardContent className="space-y-1 py-4">
        <p className="text-sm text-muted-foreground">{titulo}</p>
        <p className={`text-3xl font-semibold tabular-nums ${alerta ? "text-destructive" : ""}`}>{valor}</p>
        <p className="text-xs text-muted-foreground">{detalle}</p>
      </CardContent>
    </Card>
  );
  return href ? <Link href={href}>{contenido}</Link> : contenido;
}
