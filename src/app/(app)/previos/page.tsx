import Link from "next/link";
import { Button } from "@/components/ui/button";
import { isReadOnly } from "@/lib/roles";
import { getCurrentRole } from "@/lib/roles-server";
import { leerFiltros, PreviosTable } from "./previos-table";

export default async function PreviosPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const role = await getCurrentRole();
  const filtros = leerFiltros(await searchParams);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Previos</h1>
        {!isReadOnly(role) && (
          <Button nativeButton={false} render={<Link href="/previos/new" />}>
            Nuevo previo
          </Button>
        )}
      </div>

      <PreviosTable
        estado="en_bodega"
        readOnly={isReadOnly(role)}
        emptyMessage="Aún no hay previos en bodega."
        basePath="/previos"
        filtros={filtros}
      />
    </div>
  );
}
