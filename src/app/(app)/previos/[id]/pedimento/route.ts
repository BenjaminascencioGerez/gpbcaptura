import ExcelJS from "exceljs";
import { createClient } from "@/lib/supabase/server";
import type { Partida, Previo } from "@/lib/types";

// Excel con las partidas ya confirmadas para capturar el pedimento.
export async function GET(_req: Request, ctx: RouteContext<"/previos/[id]/pedimento">) {
  const { id } = await ctx.params;
  const supabase = await createClient();

  const { data: previo } = await supabase.from("previos").select("*").eq("id", id).single<Previo>();
  if (!previo) return new Response("Previo no encontrado.", { status: 404 });
  if (!previo.enviado_documentacion_at) {
    return new Response("El previo todavía no está en documentación (faltan fracciones por confirmar).", {
      status: 409,
    });
  }

  const { data: partidasData } = await supabase
    .from("partidas")
    .select("*")
    .eq("previo_id", id)
    .order("sin_factura", { ascending: true })
    .order("sort_order", { ascending: true })
    .returns<Partida[]>();
  const partidas = partidasData ?? [];

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Pedimento");

  const encabezado: [string, string | number | null][] = [
    ["Referencia", previo.reference],
    ["GBI / TOIM / TPIM", previo.referencia_cliente],
    ["Cliente", previo.cliente],
    ["Proveedor", previo.proveedor],
    ["Fecha de arribo", previo.fecha_arribo],
    ["Peso bruto (kg)", previo.peso_bruto],
    ["Bultos", previo.bultos_inventario ?? null],
  ];
  for (const [k, v] of encabezado) {
    const row = ws.addRow([k, v ?? ""]);
    row.getCell(1).font = { bold: true };
  }
  ws.addRow([]);

  const columnas = [
    "Factura",
    "No. Partida",
    "Fracción",
    "NICO",
    "Descripción",
    "Cantidad",
    "UM Comercial",
    "UMT",
    "País de origen",
    "Precio unitario",
    "Total",
    "Peso (kg)",
    "Marca",
    "Modelo",
    "Submodelo",
    "No. Serie",
    "ID / CAT. NO.",
    "Regulaciones",
    "Observaciones",
  ];
  const header = ws.addRow(columnas);
  header.font = { bold: true };
  header.eachCell((c) => {
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE5E7EB" } };
  });

  for (const p of partidas) {
    ws.addRow([
      p.sin_factura ? "SIN FACTURA" : (p.factura ?? ""),
      p.no_partida ?? "",
      p.fraccion_arancelaria ?? "",
      p.nico ?? "",
      p.descripcion_aa ?? "",
      p.cant_factura ?? "",
      p.um_comercial ?? "",
      p.umt ?? "",
      p.pais_origen ?? "",
      p.precio_unitario ?? "",
      p.total ?? "",
      p.peso ?? "",
      p.marca ?? "",
      p.modelo ?? "",
      p.submodelo ?? "",
      p.numserie ?? "",
      p.id_cat_no_art_no ?? "",
      p.aplica_ma ?? "",
      p.observaciones ?? "",
    ]);
  }

  // Fracción y NICO como texto para no perder ceros a la izquierda.
  ws.getColumn(3).numFmt = "@";
  ws.getColumn(4).numFmt = "@";
  ws.columns.forEach((col, i) => {
    col.width = [10, 10, 12, 6, 50, 10, 12, 8, 10, 14, 14, 10, 16, 16, 14, 18, 16, 24, 30][i] ?? 12;
  });

  const buffer = await wb.xlsx.writeBuffer();
  const nombre = `pedimento-${previo.reference.replace(/[^\w-]+/g, "_")}.xlsx`;
  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${nombre}"`,
    },
  });
}
