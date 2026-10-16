import ExcelJS from "exceljs";

export type ParsedPrevioHeader = {
  reference: string;
  cliente: string;
  fecha: string | null;
  bultos_tarimas: number | null;
  peso_bruto: number | null;
};

export type ParsedPartidaRow = {
  no_partida: number;
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

export async function parsePrevioExcel(
  buffer: Buffer
): Promise<{ header: ParsedPrevioHeader; partidas: ParsedPartidaRow[] }> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error("El archivo no tiene hojas.");

  const header: ParsedPrevioHeader = {
    reference: cellText(sheet.getCell("D11")) ?? "",
    cliente: cellText(sheet.getCell("H11")) ?? "",
    fecha: parseFechaDDMMYYYY(cellText(sheet.getCell("O11"))),
    bultos_tarimas: cellNumber(sheet.getCell("B7")),
    peso_bruto: parsePesoBruto(cellText(sheet.getCell("N9"))),
  };

  const partidas: ParsedPartidaRow[] = [];
  let row = 14;
  let sortOrder = 0;
  while (true) {
    const noPartida = cellNumber(sheet.getCell(`B${row}`));
    if (noPartida === null) break;

    const r = cellText(sheet.getCell(`R${row}`));
    const s = cellText(sheet.getCell(`S${row}`));
    const aplicaMa = [r, s].filter(Boolean).join(" - ") || null;

    partidas.push({
      no_partida: noPartida,
      fraccion_arancelaria: cellText(sheet.getCell(`C${row}`)),
      nico: cellText(sheet.getCell(`D${row}`)),
      cant_factura: cellNumber(sheet.getCell(`E${row}`)),
      um_comercial: cellText(sheet.getCell(`F${row}`)),
      descripcion_aa: cellText(sheet.getCell(`G${row}`)),
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

  if (partidas.length === 0) {
    throw new Error("No se encontraron partidas a partir de la fila 14. Verifica el formato del archivo.");
  }

  return { header, partidas };
}
