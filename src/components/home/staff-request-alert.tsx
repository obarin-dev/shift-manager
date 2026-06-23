"use client";

import Link from "next/link";
import { useState } from "react";
import type { AdminStaffRequestAlert } from "@/lib/staff-request-db";

export function StaffRequestAlert({
  requests,
  total,
}: {
  requests: AdminStaffRequestAlert[];
  total: number;
}) {
  const [dismissed, setDismissed] = useState(false);

  if (total === 0 || dismissed) {
    return null;
  }

  return (
    <section className="staff-request-alert" aria-label="出勤希望アラート">
      <div className="staff-request-alert__heading">
        <span className="staff-request-alert__icon" aria-hidden="true">
          !
        </span>
        <div>
          <h2>出勤希望が提出されています</h2>
          <p>{total}件の提出があります。勤務表作成前に確認してください。</p>
        </div>
        <Link
          className="staff-request-alert__link"
          href="/requests"
          onClick={() => setDismissed(true)}
        >
          希望一覧を見る
        </Link>
        <button
          aria-label="閉じる"
          className="staff-request-alert__close"
          onClick={() => setDismissed(true)}
          type="button"
        >
          ×
        </button>
      </div>

      <div className="staff-request-alert__list">
        {requests.map((request) => (
          <article className="staff-request-alert__item" key={request.id}>
            <strong>{request.staffName}</strong>
            <span>
              {request.date} / {request.type} / {request.time}
            </span>
            {request.memo ? <small>{request.memo}</small> : null}
          </article>
        ))}
      </div>
    </section>
  );
}
