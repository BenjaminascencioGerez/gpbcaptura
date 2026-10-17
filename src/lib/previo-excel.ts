import ExcelJS from "exceljs";
import { UM_COMERCIAL_OPTIONS } from "@/lib/um-comercial";

// El catálogo SAT de Unidad de Medida Comercial numera estas 21 unidades
// 1–21 en este mismo orden; el Excel de previo normalmente trae el número
// en la columna F en vez del texto.
function normalizeUmComercial(raw: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  const asNumber = Number(trimmed);
  if (Number.isInteger(asNumber) && asNumber >= 1 && asNumber <= UM_COMERCIAL_OPTIONS.length) {
    return UM_COMERCIAL_OPTIONS[asNumber - 1];
  }
  const upper = trimmed.toUpperCase();
  const match = UM_COMERCIAL_OPTIONS.find((u) => u === upper);
  return match ?? raw;
}

export type ParsedPrevioHeader = {
  reference: string;
  cliente: string;
  fecha: string | null;
  bultos_tarimas: number | null;
  peso_bruto: number | null;
};

export type ParsedPartidaRow = {
  no_partida: number | null;
  sin_factura: boolean;
  fraccion_arancelaria: string | null;
  nico: string | null;
  cant_factura: number | null;
  um_comercial: string | null;
  descripcion_aa: string | null;
  marca: string | null;
  modelo: string | null;
  submodelo: string | null;
  numserie: string | null;
  pais_origen: string | null;
  observaciones: string | null;
  peso: number | null;
  precio_unitario: number | null;
  total: number | null;
  id_cat_no_art_no: string | null;
  aplica_ma: string | null;
  sort_order: number;
};

function resolveValue(cell: ExcelJS.Cell | undefined): unknown {
  let v: unknown = cell?.value;
  // Formula cells come back as { formula, result } — unwrap to the computed result.
  if (v && typeof v === "object" && "result" in v) {
    v = (v as { result: unknown }).result;
  }
  // Rich text cells come back as { richText: [{ text }, ...] }.
  if (v && typeof v === "object" && "richText" in v) {
    v = (v as { richText: { text: string }[] }).richText.map((r) => r.text).join("");
  }
  return v;
}

function cellText(cell: ExcelJS.Cell | undefined): string | null {
  const v = resolveValue(cell);
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s || null;
}

function cellNumber(cell: ExcelJS.Cell | undefined): number | null {
  const v = resolveValue(cell);
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = Number(v.replace(/,/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function parseFechaDDMMYYYY(text: string | null): string | null {
  if (!text) return null;
  const m = text.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!m) return null;
  const [, d, mo, y] = m;
  return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

function parsePesoBruto(text: string | null): number | null {
  if (!text) return null;
  const m = text.match(/([\d]+(?:[.,]\d+)?)/);
  if (!m) return null;
  return Number(m[1].replace(",", "."));
}

// Busca la fila de encabezado ("No. Partida" en columna B) en cualquiera de
// las primeras 20 filas, en vez de asumir que siempre es la fila 13 — así
// sirve tanto para el template oficial como para hojas armadas a mano.
function findHeaderRow(sheet: ExcelJS.Worksheet): number | null {
  for (let row = 1; row <= 20; row++) {
    const text = cellText(sheet.getCell(`B${row}`));
    if (text && /no\.?\s*partida/i.test(text)) return row;
  }
  return null;
}

function parseSheetPartidas(sheet: ExcelJS.Worksheet, startSortOrder: number): ParsedPartidaRow[] {
  const headerRow = findHeaderRow(sheet);
  if (headerRow === null) return [];

  const partidas: ParsedPartidaRow[] = [];
  let row = headerRow + 1;
  let sortOrder = startSortOrder;
  let consecutiveBlank = 0;

  while (row < headerRow + 2000 && consecutiveBlank < 2) {
    const noPartida = cellNumber(sheet.getCell(`B${row}`));
    const descripcion = cellText(sheet.getCell(`G${row}`));

    if (noPartida === null && !descripcion) {
      consecutiveBlank++;
      row++;
      continue;
    }
    consecutiveBlank = 0;

    const r = cellText(sheet.getCell(`R${row}`));
    const s = cellText(sheet.getCell(`S${row}`));
    const aplicaMa = [r, s].filter(Boolean).join(" - ") || null;

    partidas.push({
      no_partida: noPartida,
      sin_factura: noPartida === null,
      fraccion_arancelaria: cellText(sheet.getCell(`C${row}`)),
      nico: cellText(sheet.getCell(`D${row}`)),
      cant_factura: cellNumber(sheet.getCell(`E${row}`)),
      um_comercial: normalizeUmComercial(cellText(sheet.getCell(`F${row}`))),
      descripcion_aa: descripcion,
      marca: cellText(sheet.getCell(`H${row}`)),
      modelo: cellText(sheet.getCell(`I${row}`)),
      submodelo: cellText(sheet.getCell(`J${row}`)),
      numserie: cellText(sheet.getCell(`K${row}`)),
      pais_origen: cellText(sheet.getCell(`L${row}`)),
      observaciones: cellText(sheet.getCell(`M${row}`)),
      peso: cellNumber(sheet.getCell(`N${row}`)),
      precio_unitario: cellNumber(sheet.getCell(`O${row}`)),
      total: cellNumber(sheet.getCell(`P${row}`)),
      id_cat_no_art_no: cellText(sheet.getCell(`Q${row}`)),
      aplica_ma: aplicaMa,
      sort_order: sortOrder++,
    });
    row++;
  }

  return partidas;
}

export async function parsePrevioExcel(
  buffer: Buffer
): Promise<{ header: ParsedPrevioHeader; partidas: ParsedPartidaRow[] }> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  if (workbook.worksheets.length === 0) throw new Error("El archivo no tiene hojas.");

  let header: ParsedPrevioHeader | null = null;
  const numbered: ParsedPartidaRow[] = [];
  const sinFactura: ParsedPartidaRow[] = [];

  for (const sheet of workbook.worksheets) {
    if (!header) {
      const reference = cellText(sheet.getCell("D11"));
      if (reference) {
        header = {
          reference,
          cliente: cellText(sheet.getCell("H11")) ?? "",
          fecha: parseFechaDDMMYYYY(cellText(sheet.getCell("O11"))),
          bultos_tarimas: cellNumber(sheet.getCell("B7")),
          peso_bruto: parsePesoBruto(cellText(sheet.getCell("N9"))),
        };
      }
    }

    const rows = parseSheetPartidas(sheet, numbered.length + sinFactura.length);
    for (const row of rows) {
      if (row.sin_factura) sinFactura.push(row);
      else numbered.push(row);
    }
  }

  if (!header) {
    throw new Error('No se encontró el No. de Referencia (celda D11, junto al encabezado "No. de Referencia:").');
  }

  if (numbered.length === 0 && sinFactura.length === 0) {
    throw new Error('No se encontraron partidas — verifica que alguna hoja tenga el encabezado "No. Partida".');
  }

  // Las que no tienen No. de Partida (sin cobertura de factura) van siempre
  // al final, en el mismo orden en que se encontraron.
  const partidas = [...numbered, ...sinFactura].map((p, i) => ({ ...p, sort_order: i }));

  return { header, partidas };
}
