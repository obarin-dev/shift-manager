"use client";

import { useCallback, useEffect, useState } from "react";
import type { NurseryRestSettings } from "@/lib/nursery-helpers";

type HolidaySettingsResponse = {
  data?: NurseryRestSettings;
};

export function useHolidaySettings({ enabled = true }: { enabled?: boolean } = {}) {
  const [settings, setSettings] = useState<NurseryRestSettings | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/nursery/holiday-settings", {
        cache: "no-store",
      });
      const body = (await response.json()) as HolidaySettingsResponse;

      if (!response.ok || !body.data) {
        throw new Error("load_failed");
      }

      setSettings(body.data);
    } catch {
      setError("休日設定の読み込みに失敗しました。");
      setSettings(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    void loadSettings();
  }, [loadSettings, enabled]);

  return {
    settings,
    isLoading,
    error,
    reload: loadSettings,
  };
}

