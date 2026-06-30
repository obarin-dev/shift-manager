"use client";

import { useEffect, useState } from "react";
import type { AdminStaffRequestGroup } from "@/lib/staff-request-db";
import { apiFetch, UnauthorizedError } from "@/lib/api-fetch";

export function useAdminStaffRequests(targetMonth: string, enabled = true) {
  const [groups, setGroups] = useState<AdminStaffRequestGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!enabled) {
      setGroups([]);
      setError("");
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError("");

    void apiFetch(`/api/staff-requests?scope=admin&month=${targetMonth}`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("load_failed");
        }
        const body = (await response.json()) as { data?: AdminStaffRequestGroup[] };
        if (isMounted) {
          setGroups(body.data ?? []);
        }
      })
      .catch((err: unknown) => {
        if (err instanceof UnauthorizedError) return;
        if (isMounted) {
          setError("希望一覧の読み込みに失敗しました。");
          setGroups([]);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [enabled, targetMonth]);

  return { groups, isLoading, error };
}
