"use client";

import { FormEvent, useEffect, useState } from "react";

type RequestType = "休み希望" | "出勤希望" | "時間相談";
type RequestStatus = "提出済み" | "承認" | "要確認";

type StaffRequest = {
  id: string;
  date: string;
  type: RequestType;
  time: string;
  memo: string;
  status: RequestStatus;
};

const requestTypes: RequestType[] = ["休み希望", "出勤希望", "時間相談"];

function getTodayDateKey() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatShortDate(date: string) {
  const [, month, day] = date.split("-");
  return `${Number(month)}/${Number(day)}`;
}

function getStatusClass(status: RequestStatus) {
  if (status === "承認") {
    return "staff-request-badge staff-request-badge--approved";
  }
  if (status === "要確認") {
    return "staff-request-badge staff-request-badge--attention";
  }
  return "staff-request-badge staff-request-badge--pending";
}

export function StaffRequestPanel() {
  const [date, setDate] = useState(getTodayDateKey);
  const [type, setType] = useState<RequestType>("休み希望");
  const [time, setTime] = useState("終日");
  const [memo, setMemo] = useState("");
  const [requests, setRequests] = useState<StaffRequest[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; kind: "success" | "error" } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const showToast = (text: string, kind: "success" | "error" = "success") => {
    setToast({ text, kind });
  };

  useEffect(() => {
    if (!toast) {
      return;
    }
    const timer = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    let isMounted = true;

    async function loadRequests() {
      try {
        const response = await fetch("/api/staff-requests");
        if (!response.ok) {
          throw new Error("load_failed");
        }
        const body = (await response.json()) as { data?: StaffRequest[] };
        if (isMounted) {
          setRequests(body.data ?? []);
        }
      } catch {
        if (isMounted) {
          showToast("提出済みの読み込みに失敗しました。", "error");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadRequests();

    return () => {
      isMounted = false;
    };
  }, []);

  const resetForm = () => {
    setDate(getTodayDateKey());
    setType("休み希望");
    setTime("終日");
    setMemo("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);

    try {
      const response = await fetch(
        editingId ? `/api/staff-requests/${editingId}` : "/api/staff-requests",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date, type, time, memo }),
        },
      );

      if (!response.ok) {
        const errBody = (await response.json().catch(() => ({}))) as { error?: string };
        if (errBody.error === "duplicate_request") {
          showToast("同じ日・種別の希望がすでに提出されています。", "error");
        } else if (errBody.error === "request_locked") {
          showToast("承認済みの申請は編集できません。", "error");
        } else {
          showToast(editingId ? "編集の保存に失敗しました。" : "提出に失敗しました。", "error");
        }
        setEditingId(null);
        setSelectedRequestId(null);
        resetForm();
        return;
      }

      const body = (await response.json()) as { data?: StaffRequest };
      if (!body.data) {
        showToast(editingId ? "編集の保存に失敗しました。" : "提出に失敗しました。", "error");
        setEditingId(null);
        setSelectedRequestId(null);
        resetForm();
        return;
      }

      if (editingId) {
        setRequests((current) =>
          current.map((request) => (request.id === editingId ? body.data! : request)),
        );
        setEditingId(null);
        setSelectedRequestId(null);
        resetForm();
        showToast("編集内容を保存しました。");
      } else {
        setRequests((current) => [...current, body.data!]);
        resetForm();
        showToast("提出しました。");
      }
    } catch {
      showToast(editingId ? "編集の保存に失敗しました。" : "提出に失敗しました。", "error");
      setEditingId(null);
      setSelectedRequestId(null);
      resetForm();
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (request: StaffRequest) => {
    setDate(request.date);
    setType(request.type);
    setTime(request.time);
    setMemo(request.memo);
    setEditingId(request.id);
    setSelectedRequestId(null);
    setToast(null);
  };

  const handleEditSelected = () => {
    const selectedRequest = requests.find((request) => request.id === selectedRequestId);
    if (!selectedRequest) {
      showToast("編集する希望をチェックしてください。", "error");
      return;
    }
    handleEdit(selectedRequest);
  };

  const handleDeleteSelected = async () => {
    if (!selectedRequestId) {
      showToast("削除する希望をチェックしてください。", "error");
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(`/api/staff-requests/${selectedRequestId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("delete_failed");
      }

      setRequests((current) => current.filter((request) => request.id !== selectedRequestId));
      if (editingId === selectedRequestId) {
        setEditingId(null);
        resetForm();
      }
      setSelectedRequestId(null);
      showToast("削除しました。");
    } catch {
      showToast("削除に失敗しました。", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="staff-request-layout" aria-label="出勤希望入力">
      <form className="staff-request-card" onSubmit={handleSubmit}>
        <div className="staff-request-card-heading">
          <h2>希望を提出する</h2>
          {editingId ? <span className="staff-request-editing-badge">編集中</span> : null}
        </div>

        <div className="staff-request-form">
          <label className="form-field">
            対象日
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </label>

          <div className="staff-request-field">
            <span>希望の種類</span>
            <div className="staff-request-choice-row" role="group" aria-label="希望の種類">
              {requestTypes.map((requestType) => (
                <button
                  className={
                    requestType === type
                      ? "staff-request-choice is-active"
                      : "staff-request-choice"
                  }
                  key={requestType}
                  onClick={() => setType(requestType)}
                  type="button"
                >
                  {requestType}
                </button>
              ))}
            </div>
          </div>

          <label className="form-field">
            希望時間（任意）
            <select value={time} onChange={(event) => setTime(event.target.value)}>
              <option>終日</option>
              <option>午前のみ</option>
              <option>午後のみ</option>
              <option>早番希望</option>
              <option>遅番不可</option>
            </select>
          </label>

          <label className="form-field">
            メモ（任意）
            <textarea value={memo} onChange={(event) => setMemo(event.target.value)} />
          </label>

          <div className="staff-request-actions">
            <button
              className="secondary-button"
              disabled={isSaving}
              onClick={() => showToast("下書きとして画面に残しました。")}
              type="button"
            >
              下書き
            </button>
            <button className="primary-button" disabled={isSaving} type="submit">
              {isSaving ? "保存中..." : editingId ? "編集を保存" : "提出する"}
            </button>
          </div>
        </div>
      </form>

      <aside className="staff-request-card">
        <div className="staff-request-card-heading">
          <h2>提出済み</h2>
          <div className="staff-request-heading-actions">
            <button
              aria-label="チェックした希望を編集"
              className="staff-request-icon-button"
              disabled={!selectedRequestId || isSaving}
              onClick={handleEditSelected}
              type="button"
            >
              <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
                <path
                  d="M12 20h9M15.5 3.5a2.1 2.1 0 1 1 3 3L7 18l-4 1 1-4 11.5-11.5Z"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.8"
                />
              </svg>
            </button>
            <button
              aria-label="チェックした希望を削除"
              className="staff-request-icon-button staff-request-icon-button--danger"
              disabled={!selectedRequestId || isSaving}
              onClick={handleDeleteSelected}
              type="button"
            >
              <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
                <path
                  d="M4 7h16M10 11v6M14 11v6M6 7l1 14h10l1-14M9 7V4h6v3"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.8"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className="staff-request-list">
          {isLoading ? <p className="staff-request-empty">読み込み中...</p> : null}
          {!isLoading && requests.length === 0 ? (
            <p className="staff-request-empty">まだ提出はありません。</p>
          ) : null}
          {requests.map((request) => (
            <article className="staff-request-item" key={request.id}>
              <label className="staff-request-check">
                <input
                  checked={selectedRequestId === request.id}
                  onChange={() =>
                    setSelectedRequestId((current) =>
                      current === request.id ? null : request.id,
                    )
                  }
                  type="checkbox"
                />
                <span className="sr-only">{request.type}を選択</span>
              </label>
              <div className="staff-request-date">{formatShortDate(request.date)}</div>
              <div>
                <strong>{request.type}</strong>
                <p>{request.memo || request.time}</p>
              </div>
              <span className={getStatusClass(request.status)}>{request.status}</span>
            </article>
          ))}
        </div>

      </aside>

      {toast ? (
        <div
          className={
            toast.kind === "error"
              ? "staff-request-toast staff-request-toast--error"
              : "staff-request-toast"
          }
          role="status"
        >
          {toast.text}
        </div>
      ) : null}
    </section>
  );
}
