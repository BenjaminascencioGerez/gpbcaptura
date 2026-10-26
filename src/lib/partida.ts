import type { Partida } from "./types";

// "1456-3" cuando la partida trae factura; si no, solo el número.
export function etiquetaPartida(p: Pick<Partida, "factura" | "no_partida">): string {
  if (p.no_partida === null) return "(sin factura)";
  return p.factura ? `${p.factura}-${p.no_partida}` : String(p.no_partida);
}

// "10 partidas de la factura 1456 y 7 de la factura 1430".
export function resumenPorFactura(partidas: Pick<Partida, "factura" | "sin_factura">[]): string {
  const conteo = new Map<string, number>();
  let sinFactura = 0;
  for (const p of partidas) {
    if (p.sin_factura) sinFactura++;
    else conteo.set(p.factura ?? "", (conteo.get(p.factura ?? "") ?? 0) + 1);
  }
  const partes = [...conteo.entries()].map(([f, n], i) => {
    const sustantivo = i === 0 ? (n === 1 ? "partida" : "partidas") : "";
    const cuenta = sustantivo ? `${n} ${sustantivo}` : String(n);
    return f ? `${cuenta} de la factura ${f}` : `${cuenta} sin número de factura`;
  });
  if (sinFactura > 0) partes.push(`${sinFactura} sin factura (sin No. de partida)`);
  if (partes.length <= 1) return partes.join("");
  return `${partes.slice(0, -1).join(", ")} y ${partes[partes.length - 1]}`;
}
