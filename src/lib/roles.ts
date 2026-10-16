export type Role =
  | "captura"
  | "clasificador"
  | "glosador"
  | "ejecutivo"
  | "administrador"
  | "super_admin";

export const ROLE_LABELS: Record<Role, string> = {
  captura: "Captura",
  clasificador: "Clasificador",
  glosador: "Glosador",
  ejecutivo: "Ejecutivo",
  administrador: "Administrador",
  super_admin: "Super Admin",
};

export function canManageUsers(role: Role | null): boolean {
  return role === "administrador" || role === "super_admin";
}

export function canClassify(role: Role | null): boolean {
  return role === "clasificador" || role === "administrador" || role === "super_admin";
}

export function canGlosar(role: Role | null): boolean {
  return role === "glosador" || role === "administrador" || role === "super_admin";
}

export function canCapture(role: Role | null): boolean {
  return (
    role === "captura" ||
    role === "clasificador" ||
    role === "glosador" ||
    role === "administrador" ||
    role === "super_admin"
  );
}

export function isReadOnly(role: Role | null): boolean {
  return role === "ejecutivo";
}
