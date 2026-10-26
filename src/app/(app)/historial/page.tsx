import { isReadOnly } from "@/lib/roles";
import { getCurrentRole } from "@/lib/roles-server";
import { leerFiltros, PreviosTable } from "../previos/previos-table";

export default async function HistorialPreviosPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const role = await getCurrentRole();
  const filtros = leerFiltros(await searchParams);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Historial de previos</h1>
      <PreviosTable
        estado="importado"
        readOnly={isReadOnly(role)}
        emptyMessage="Aún no hay previos importados."
        basePath="/historial"
        filtros={filtros}
      />
    </div>
  );
}
