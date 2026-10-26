import { isReadOnly } from "@/lib/roles";
import { getCurrentRole } from "@/lib/roles-server";
import { PreviosTable } from "../previos/previos-table";

export default async function HistorialPreviosPage() {
  const role = await getCurrentRole();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Historial de previos</h1>
      <PreviosTable
        estado="importado"
        readOnly={isReadOnly(role)}
        emptyMessage="Aún no hay previos importados."
      />
    </div>
  );
}
