"use client";

import { useEffect, useState } from "react";
import type { NotificationPayload } from "@/lib/notification-db";

type NotificationPanelProps = {
  initialNotifications: NotificationPayload[];
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function NotificationPanel({ initialNotifications }: NotificationPanelProps) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [marked, setMarked] = useState(false);

  const unread = notifications.filter((n) => !n.isRead);

  useEffect(() => {
    if (!marked && unread.length > 0) {
      setMarked(true);
      fetch("/api/notifications", { method: "PATCH" }).catch(() => {});
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    }
  }, [marked, unread.length]);

  if (notifications.length === 0) return null;

  return (
    <section className="notification-panel" aria-label="お知らせ">
      <h2 className="notification-panel__title">
        お知らせ
        {unread.length > 0 && (
          <span className="notification-panel__badge">{unread.length}件の未読</span>
        )}
      </h2>
      <ul className="notification-panel__list">
        {notifications.map((n) => (
          <li
            key={n.id}
            className={
              n.isRead
                ? "notification-panel__item"
                : "notification-panel__item notification-panel__item--unread"
            }
          >
            <span className="notification-panel__item-title">{n.title}</span>
            {n.body ? <span className="notification-panel__item-body">{n.body}</span> : null}
            <span className="notification-panel__item-date">{formatDate(n.createdAt)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
