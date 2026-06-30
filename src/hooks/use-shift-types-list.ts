"use client";

import { useCallback, useEffect, useState } from "react";
import type { ShiftTypeDefinition } from "@/lib/nursery-helpers";
import { apiFetch, UnauthorizedError } from "@/lib/api-fetch";
import {
  DEFAULT_SHIFT_TYPE_COLOR,
  getDefaultColorForShiftCode,
  normalizeShiftColor,
} from "@/lib/shift-type-colors";

function normalizeShiftType(shift: ShiftTypeDefinition): ShiftTypeDefinition {
  return {
    ...shift,
    color:
      normalizeShiftColor(shift.color) ??
      getDefaultColorForShiftCode(shift.code) ??
      DEFAULT_SHIFT_TYPE_COLOR,
  };
}

export function useShiftTypesList() {
  const [shiftTypes, setShiftTypes] = useState<ShiftTypeDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadShiftTypes = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiFetch("/api/shift-types");
      const body = (await response.json()) as { data?: ShiftTypeDefinition[] };

      if (!response.ok) {
        throw new Error("load_failed");
      }

      setShiftTypes((body.data ?? []).map(normalizeShiftType));
    } catch (err) {
      if (err instanceof UnauthorizedError) return;
      setError("勤務区分の取得に失敗しました。");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadShiftTypes();
  }, [loadShiftTypes]);

  return { shiftTypes, isLoading, error, reload: loadShiftTypes };
}
