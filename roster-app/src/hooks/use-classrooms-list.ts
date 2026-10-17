"use client";

import { useCallback, useEffect, useState } from "react";
import type { Classroom } from "@/lib/classroom-helpers";
import { apiFetch, UnauthorizedError } from "@/lib/api-fetch";

export function useClassroomsList({ enabled = true }: { enabled?: boolean } = {}) {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const loadClassrooms = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiFetch("/api/classrooms");
      const body = (await response.json()) as { data?: Classroom[] };

      if (!response.ok) {
        throw new Error("load_failed");
      }

      setClassrooms(
        (body.data ?? []).map((classroom) => ({
          ...classroom,
          auxiliarySlots: classroom.auxiliarySlots ?? [],
          otherStaffIds: classroom.otherStaffIds ?? [],
        })),
      );
    } catch (err) {
      if (err instanceof UnauthorizedError) return;
      setError("クラス一覧の取得に失敗しました。");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    void loadClassrooms();
  }, [loadClassrooms, enabled]);

  return { classrooms, isLoading, error, reload: loadClassrooms };
}
