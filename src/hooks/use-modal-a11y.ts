"use client";

import { useEffect, type RefObject } from "react";

/** Tab で移動できる要素のセレクタ。disabled と tabindex="-1" は除く */
const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

type Options = {
  /** モーダルのルート要素 */
  ref: RefObject<HTMLElement | null>;
  /** モーダルが開いているか */
  isOpen: boolean;
  /** Escape キーや閉じる操作で呼ばれる */
  onClose: () => void;
};

/**
 * モーダルのキーボード操作とフォーカス管理をまとめて扱う。
 *
 * - 開いたときにモーダル内へフォーカスを移す
 * - Tab / Shift+Tab をモーダル内で循環させる（フォーカストラップ）
 * - Escape で閉じる
 * - 閉じたときに開く前の要素へフォーカスを戻す
 *
 * これらが揃って初めて `aria-modal="true"` を付けられる。フォーカストラップが
 * 無いまま aria-modal を付けると、支援技術には背景が隠れたと伝わる一方で
 * Tab は背景へ抜けてしまい、読み上げと実際のフォーカスが食い違う。
 */
export function useModalA11y({ ref, isOpen, onClose }: Options) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const modal = ref.current;
    if (!modal) {
      return;
    }

    // 開く前にフォーカスされていた要素を覚えておき、閉じたら戻す
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const getFocusable = () =>
      Array.from(modal.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );

    // 最初の操作対象へフォーカスを移す。何も無ければモーダル自体へ
    const focusables = getFocusable();
    if (focusables.length > 0) {
      focusables[0].focus();
    } else {
      modal.setAttribute("tabindex", "-1");
      modal.focus();
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const items = getFocusable();
      if (items.length === 0) {
        event.preventDefault();
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      // 端まで来たら反対側へ回し、モーダルの外へ出さない
      if (event.shiftKey && (active === first || !modal.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [ref, isOpen, onClose]);
}
