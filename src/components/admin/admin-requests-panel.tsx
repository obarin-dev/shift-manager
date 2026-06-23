"use client";

import { useState } from "react";
import type { AdminStaffRequestGroup } from "@/lib/staff-request-db";

function formatShortDate(date: string) {
  const [, month, day] = date.split("-");
  return `${Number(month)}/${Number(day)}`;
}

export function AdminRequestsPanel({ groups }: { groups: AdminStaffRequestGroup[] }) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    () =>
      new Set(
        groups
          .filter((g) => g.requests.some((r) => r.status === "提出済み"))
          .map((g) => g.staffId),
      ),
  );

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

  return (
    <section className="admin-requests-panel" aria-label="提出された出勤希望">
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
                        <span>{request.type}</span>
                        <span>{request.time}</span>
                        {request.status === "承認" && (
                          <span className="admin-requests-date-item__approved">✓ 反映済み</span>
                        )}
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
