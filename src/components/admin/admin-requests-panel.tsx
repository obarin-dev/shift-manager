"use client";

import { useEffect, useState } from "react";
import type { AdminStaffRequestGroup } from "@/lib/staff-request-db";

function formatShortDate(date: string) {
  const [, month, day] = date.split("-");
  return `${Number(month)}/${Number(day)}`;
}

type RequestStatus = "提出済み" | "承認" | "要確認";

type LocalRequest = {
  id: string;
  date: string;
  type: string;
  time: string;
  memo: string;
  status: RequestStatus;
};

type LocalGroup = {
  staffId: string;
  staffName: string;
  requests: LocalRequest[];
};

export function AdminRequestsPanel({ groups: initialGroups }: { groups: AdminStaffRequestGroup[] }) {
  const [groups, setGroups] = useState<LocalGroup[]>(initialGroups as LocalGroup[]);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    () =>
      new Set(
        initialGroups
          .filter((g) => g.requests.some((r) => r.status === "提出済み"))
          .map((g) => g.staffId),
      ),
  );

  useEffect(() => {
    setGroups(initialGroups as LocalGroup[]);
    setExpandedIds(
      new Set(
        initialGroups
          .filter((g) => g.requests.some((r) => r.status === "提出済み"))
          .map((g) => g.staffId),
      ),
    );
  }, [initialGroups]);

  if (groups.length === 0) {
    return (
      <section className="admin-requests-panel">
        <p className="admin-requests-empty">登録されている職員がいません。</p>
      </section>
    );
  }

  function toggle(staffId: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(staffId)) {
        next.delete(staffId);
      } else {
        next.add(staffId);
      }
      return next;
    });
  }

  async function handleRevoke(requestId: string) {
    setRevoking(requestId);
    try {
      const res = await fetch(`/api/staff-requests/${requestId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "submitted" }),
      });
      if (!res.ok) throw new Error("revoke_failed");

      setGroups((prev) =>
        prev.map((g) => ({
          ...g,
          requests: g.requests.map((r) =>
            r.id === requestId ? { ...r, status: "提出済み" as RequestStatus } : r,
          ),
        })),
      );
    } catch {
      setErrorMessage("取り下げに失敗しました。再度お試しください。");
    } finally {
      setRevoking(null);
    }
  }

  return (
    <section className="admin-requests-panel" aria-label="提出された出勤希望">
      {errorMessage ? (
        <div className="staff-request-toast staff-request-toast--error" role="alert">
          {errorMessage}
          <button
            className="admin-requests-error-dismiss"
            onClick={() => setErrorMessage(null)}
            type="button"
            aria-label="閉じる"
          >
            ✕
          </button>
        </div>
      ) : null}
      <div className="admin-requests-staff-list" aria-label="職員一覧">
        {groups.map((group) => {
          const isExpanded = expandedIds.has(group.staffId);
          const pendingCount = group.requests.filter((r) => r.status === "提出済み").length;

          return (
            <div className="admin-requests-staff-row" key={group.staffId}>
              <button
                aria-expanded={isExpanded}
                className={
                  isExpanded
                    ? "admin-requests-staff-button is-active"
                    : "admin-requests-staff-button"
                }
                onClick={() => toggle(group.staffId)}
                type="button"
              >
                {group.staffName}
                {pendingCount > 0 && (
                  <span className="admin-requests-staff-badge">{pendingCount}</span>
                )}
              </button>

              {isExpanded ? (
                group.requests.length > 0 ? (
                  <ul className="admin-requests-date-list">
                    {group.requests.map((request) => (
                      <li
                        className={
                          request.status === "承認"
                            ? "admin-requests-date-item admin-requests-date-item--approved"
                            : "admin-requests-date-item"
                        }
                        key={request.id}
                      >
                        <span className="admin-requests-date-item__date">
                          {formatShortDate(request.date)}
                        </span>
                        <span className="admin-requests-date-item__type-cell">
                          <span>{request.type}</span>
                          <span className="admin-requests-date-item__time">{request.time}</span>
                        </span>
                        {request.status === "承認" ? (
                          <>
                            <span className="admin-requests-date-item__approved">✓ 反映済み</span>
                            <button
                              className="admin-requests-revoke-button"
                              disabled={revoking === request.id}
                              onClick={() => handleRevoke(request.id)}
                              type="button"
                            >
                              {revoking === request.id ? "..." : "取り下げ"}
                            </button>
                          </>
                        ) : null}
                        {request.memo ? <small>{request.memo}</small> : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="admin-requests-empty admin-requests-empty--inline">
                    まだ希望は提出されていません。
                  </p>
                )
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
