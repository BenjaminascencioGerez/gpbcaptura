"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { setUserRole } from "./actions";
import { ROLE_LABELS, type Role } from "@/lib/roles";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function RoleSelect({ userId, role }: { userId: string; role: Role }) {
  const [pending, startTransition] = useTransition();

  return (
    <Select
      items={ROLE_LABELS}
      value={role}
      disabled={pending}
      onValueChange={(v) =>
        startTransition(async () => {
          const res = await setUserRole(userId, v as Role);
          if (res?.error) toast.error(res.error);
          else toast.success("Rol actualizado");
        })
      }
    >
      <SelectTrigger className="w-44">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
          <SelectItem key={r} value={r}>
            {ROLE_LABELS[r]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
