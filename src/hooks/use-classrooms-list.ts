"use client";

import { useCallback, useEffect, useState } from "react";
import type { Classroom } from "@/lib/mock-classes";

export function useClassroomsList() {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadClassrooms = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/classrooms");
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
    } catch {
      setError("クラス一覧の取得に失敗しました。");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadClassrooms();
  }, [loadClassrooms]);

  return { classrooms, isLoading, error, reload: loadClassrooms };
}
