"use client";

import { useCallback, useEffect, useState } from "react";
import type { NurseryRestSettings } from "@/lib/nursery-helpers";
import { apiFetch, UnauthorizedError } from "@/lib/api-fetch";

type HolidaySettingsResponse = {
  data?: NurseryRestSettings;
};

export function useHolidaySettings() {
  const [settings, setSettings] = useState<NurseryRestSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiFetch("/api/nursery/holiday-settings", {
        cache: "no-store",
      });
      const body = (await response.json()) as HolidaySettingsResponse;

      if (!response.ok || !body.data) {
        throw new Error("load_failed");
      }

      setSettings(body.data);
    } catch (err) {
      if (err instanceof UnauthorizedError) return;
      setError("休日設定の読み込みに失敗しました。");
      setSettings(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  return {
    settings,
    isLoading,
    error,
    reload: loadSettings,
  };
}

