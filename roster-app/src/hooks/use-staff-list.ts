"use client";

import { useCallback, useEffect, useState } from "react";
import type { StaffMember } from "@/lib/staff-helpers";
import { apiFetch, UnauthorizedError } from "@/lib/api-fetch";

export function useStaffList({ enabled = true }: { enabled?: boolean } = {}) {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const loadStaff = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiFetch("/api/staff");
      const body = (await response.json()) as { data?: StaffMember[] };

      if (!response.ok) {
        throw new Error("load_failed");
      }

      setStaff(
        (body.data ?? []).map((member) => ({
          ...member,
          capable_class_ids: member.capable_class_ids ?? [],
          work_availability: member.work_availability ?? { start: "", end: "" },
        })),
      );
    } catch (err) {
      if (err instanceof UnauthorizedError) return;
      setError("職員一覧の取得に失敗しました。");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    void loadStaff();
  }, [loadStaff, enabled]);

  const getStaffName = useCallback(
    (id: string | null | undefined) => {
      if (!id) {
        return null;
      }

      return staff.find((member) => member.id === id)?.name ?? null;
    },
    [staff],
  );

  const getStaffNames = useCallback(
    (ids: string[] | null | undefined) => {
      return (ids ?? [])
        .map((id) => getStaffName(id))
        .filter((name): name is string => Boolean(name));
    },
    [getStaffName],
  );

  return {
    staff,
    setStaff,
    isLoading,
    error,
    reload: loadStaff,
    getStaffName,
    getStaffNames,
  };
}
