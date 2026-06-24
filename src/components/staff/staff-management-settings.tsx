"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useClassroomsList } from "@/hooks/use-classrooms-list";
import { useStaffList } from "@/hooks/use-staff-list";
import type { UserRole } from "@/lib/auth-session";
import {
  compareStaffLoginIds,
  EMPTY_STAFF_SHIFT_TIME,
  formatStaffLoginId,
  formatStaffWorkAvailability,
  staffLoginIdToInput,
  getEmploymentTypeLabel,
  type StaffMember,
} from "@/lib/staff-helpers";
import { StaffFormModal, type StaffFormValues } from "@/components/staff/staff-form-modal";
import { StaffDetailPanel } from "@/components/staff/staff-detail-panel";
import {
  formatStaffClassLabels,
  getStaffClassAssignment,
} from "@/lib/staff-class-assignment";

type ModalState = { type: "edit"; staffId: string } | { type: "create" } | null;

type InviteMethod = "qr" | "url";
type InviteStatus = "pending" | "used" | "expired" | "disabled";

type InvitationRecord = {
  id: string;
  staffId: string | null;
  adminNote: string;
  registeredName: string | null;
  method: InviteMethod;
  status: InviteStatus;
  inviteUrl: string;
  createdAt: string;
  expiresAt: string;
};

type InvitationDraft = {
  adminNote: string;
  method: InviteMethod;
  expiryHours: number;
};

const EMPTY_INVITATION_DRAFT: InvitationDraft = {
  adminNote: "",
  method: "qr",
  expiryHours: 168,
};

const EMPTY_STAFF_FORM_VALUES: StaffFormValues = {
  staff_id: "",
  name: "",
  employment_type: "",
  job_type: "",
  has_nursery_teacher_license: true,
  work_availability: EMPTY_STAFF_SHIFT_TIME,
  is_active: true,
};

const INVITATION_EXPIRY_OPTIONS = [
  { value: 24, label: "24時間" },
  { value: 72, label: "72時間" },
  { value: 168, label: "7日間" },
];

function staffToFormValues(staff: StaffMember) {
  return {
    staff_id: staffLoginIdToInput(staff.staff_id),
    name: staff.name,
    employment_type: staff.employment_type,
    job_type: staff.job_type,
    has_nursery_teacher_license: staff.has_nursery_teacher_license,
    work_availability: staff.work_availability,
    is_active: staff.is_active,
  };
}

type StaffManagementSettingsProps = {
  role: UserRole;
  roleLabel?: string;
};

function staffToApiPayload(values: StaffFormValues) {
  return {
    name: values.name.trim(),
    employment_type: values.employment_type,
    job_type: values.job_type,
    has_nursery_teacher_license: values.has_nursery_teacher_license,
    work_availability: values.work_availability,
    is_active: values.is_active,
  };
}

export function StaffManagementSettings({
  role: _role,
}: StaffManagementSettingsProps) {
  const {
    staff: staffMembers,
    setStaff: setStaffMembers,
    isLoading: staffLoading,
    error: staffLoadError,
    reload: reloadStaff,
  } = useStaffList();
  const { classrooms } = useClassroomsList();
  const [modalState, setModalState] = useState<ModalState>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteTargetStaffId, setInviteTargetStaffId] = useState<string | null>(
    null,
  );
  const [inviteDraft, setInviteDraft] = useState<InvitationDraft>(
    EMPTY_INVITATION_DRAFT,
  );
  const [inviteError, setInviteError] = useState("");
  const [issuedInvitationId, setIssuedInvitationId] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState("");
  const [invitations, setInvitations] = useState<InvitationRecord[]>([]);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    type ApiInv = {
      id: string;
      staffId: string | null;
      staffName: string | null;
      adminNote: string;
      method: InviteMethod;
      status: InviteStatus;
      token: string;
      expiresAt: string;
      createdAt: string;
    };
    fetch("/api/invitations")
      .then((res) => (res.ok ? res.json() : null))
      .then((body: { data?: ApiInv[] } | null) => {
        if (!body?.data) return;
        const origin = window.location.origin;
        setInvitations(
          body.data.map((inv) => ({
            id: inv.id,
            staffId: inv.staffId,
            adminNote: inv.adminNote,
            registeredName: inv.staffName,
            method: inv.method,
            status: inv.status,
            inviteUrl: `${origin}/register/${inv.token}`,
            createdAt: inv.createdAt,
            expiresAt: inv.expiresAt,
          })),
        );
      })
      .catch(() => undefined);
  }, []);

  const sortedStaff = useMemo(() => {
    return [...staffMembers].sort((a, b) => {
      const byStaffId = compareStaffLoginIds(a.staff_id, b.staff_id);
      if (byStaffId !== 0) {
        return byStaffId;
      }

      return a.name.localeCompare(b.name, "ja");
    });
  }, [staffMembers]);

  const filteredStaff = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return sortedStaff;
    }

    return sortedStaff.filter(
      (staff) =>
        staff.name.toLowerCase().includes(normalized) ||
        staff.staff_id.includes(normalized) ||
        formatStaffLoginId(staff.staff_id).includes(normalized),
    );
  }, [query, sortedStaff]);

  const selectedStaff = useMemo(() => {
    return detailId ? staffMembers.find((s) => s.id === detailId) ?? null : null;
  }, [detailId, staffMembers]);

  const latestInvitation = useMemo(
    () => invitations.find((item) => item.id === issuedInvitationId) ?? null,
    [invitations, issuedInvitationId],
  );

  const editingStaff =
    modalState?.type === "edit"
      ? staffMembers.find((s) => s.id === modalState.staffId) ?? null
      : null;

  const inviteTargetStaff = useMemo(() => {
    return inviteTargetStaffId
      ? staffMembers.find((s) => s.id === inviteTargetStaffId) ?? null
      : null;
  }, [inviteTargetStaffId, staffMembers]);

  const formModalOpen = modalState !== null;
  const formModalMode = modalState?.type === "create" ? "create" : "edit";
  const formInitialValues =
    modalState?.type === "edit" && editingStaff
      ? staffToFormValues(editingStaff)
      : EMPTY_STAFF_FORM_VALUES;

  const getStaffPendingInvitation = (staffId: string) => {
    return invitations.find(
      (item) => item.staffId === staffId && item.status === "pending",
    );
  };

  const openCreate = () => {
    setDetailId(null);
    setModalState({ type: "create" });
  };

  const openInviteForStaff = (staff: StaffMember) => {
    setInviteTargetStaffId(staff.id);
    setInviteDraft({
      ...EMPTY_INVITATION_DRAFT,
      adminNote: staff.name,
    });
    setInviteError("");
    setCopyMessage("");
    setIssuedInvitationId(null);
    setInviteOpen(true);
  };

  const closeInvite = () => {
    setInviteOpen(false);
    setInviteTargetStaffId(null);
    setInviteError("");
    setCopyMessage("");
  };

  const openEdit = (staff: StaffMember) => {
    setDetailId(null);
    setModalState({ type: "edit", staffId: staff.id });
  };

  const handleSave = async (values: StaffFormValues) => {
    setSaveError(null);

    const isEdit = modalState?.type === "edit" && editingStaff;
    const url = isEdit ? `/api/staff/${editingStaff.id}` : "/api/staff";
    const method = isEdit ? "PATCH" : "POST";
    const payload = staffToApiPayload(values);

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await response.json()) as {
        data?: StaffMember;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(body.error ?? "save_failed");
      }

      if (body.data) {
        const saved = {
          ...body.data,
          work_availability: body.data.work_availability ?? {
            start: "",
            end: "",
          },
        };

        setStaffMembers((current) => {
          if (isEdit) {
            return current.map((staff) =>
              staff.id === saved.id ? saved : staff,
            );
          }

          return [...current, saved];
        });
      } else {
        await reloadStaff();
      }

      setModalState(null);
      setDetailId(null);
    } catch {
      setSaveError("職員の保存に失敗しました。もう一度お試しください。");
    }
  };

  const handleToggleActive = async () => {
    if (!selectedStaff) {
      return;
    }

    const payload = staffToApiPayload(staffToFormValues(selectedStaff));
    payload.is_active = !selectedStaff.is_active;

    try {
      const response = await fetch(`/api/staff/${selectedStaff.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("toggle_failed");
      }

      const body = (await response.json()) as { data?: StaffMember };

      if (body.data) {
        setStaffMembers((current) =>
          current.map((staff) => (staff.id === body.data!.id ? body.data! : staff)),
        );
      } else {
        await reloadStaff();
      }
    } catch {
      setSaveError("状態の更新に失敗しました。");
    }
  };

  const handleInviteSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setInviteError("");
    setCopyMessage("");

    void (async () => {
      try {
        const response = await fetch("/api/invitations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            staff_id: inviteTargetStaffId,
            admin_note: inviteDraft.adminNote.trim(),
            method: inviteDraft.method,
            expiry_hours: inviteDraft.expiryHours,
          }),
        });

        type ApiInvitation = {
          id: string;
          staffId: string | null;
          staffName: string | null;
          adminNote: string;
          method: InviteMethod;
          status: InviteStatus;
          inviteUrl: string;
          createdAt: string;
          expiresAt: string;
        };
        const body = (await response.json()) as {
          data?: ApiInvitation;
          error?: string;
        };

        if (!response.ok || !body.data) {
          setInviteError("招待の発行に失敗しました。もう一度お試しください。");
          return;
        }

        const invitation: InvitationRecord = {
          id: body.data.id,
          staffId: body.data.staffId,
          adminNote: body.data.adminNote,
          registeredName: body.data.staffName ?? null,
          method: body.data.method,
          status: body.data.status,
          inviteUrl: body.data.inviteUrl,
          createdAt: body.data.createdAt,
          expiresAt: body.data.expiresAt,
        };

        setInvitations((current) => [invitation, ...current]);
        setIssuedInvitationId(invitation.id);
      } catch {
        setInviteError("招待の発行に失敗しました。もう一度お試しください。");
      }
    })();
  };

  const handleCopyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopyMessage("URLをコピーしました。");
    } catch {
      setCopyMessage("コピーに失敗しました。手動でコピーしてください。");
    }
  };

  return (
    <>
      <section
        className="classes-panel classes-panel--scroll-body"
        aria-label="職員一覧"
      >
        <div className="classes-panel__fixed">
          <div className="classes-panel__toolbar">
            <p className="classes-panel__count">
              職員数：{filteredStaff.length}名
            </p>
            <button className="primary-button" onClick={openCreate} type="button">
              職員新規登録
            </button>
          </div>

          <label className="form-field" htmlFor="staff-search">
            <span>氏名・職員IDで検索</span>
            <input
              id="staff-search"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="例: 山田 / 1"
              type="text"
              value={query}
            />
          </label>
        </div>

        <div className="classes-panel__scroll-region">
          {staffLoadError ? (
            <div className="classes-empty">
              <p>{staffLoadError}</p>
            </div>
          ) : null}
          {staffLoading ? (
            <div className="classes-empty">
              <p>読み込み中…</p>
            </div>
          ) : null}
          {!staffLoading && !staffLoadError && filteredStaff.length === 0 ? (
            <div className="classes-empty">
              <h2>一致する職員がいません</h2>
              <p>条件を変えて再検索してください。</p>
            </div>
          ) : !staffLoading && !staffLoadError ? (
            <div className="classes-table-wrap">
              <table className="classes-table">
              <thead>
                <tr>
                  <th scope="col">職員ID</th>
                  <th scope="col">氏名</th>
                  <th scope="col">職種</th>
                  <th scope="col">雇用区分</th>
                  <th scope="col">保育士資格</th>
                  <th scope="col">担任</th>
                  <th scope="col">働ける時間</th>
                  <th scope="col">招待</th>
                </tr>
              </thead>
              <tbody>
                {filteredStaff.map((staff) => {
                  const pendingInvite = getStaffPendingInvitation(staff.id);

                  return (
                  <tr key={staff.id}>
                    <td>
                      <span
                        className={
                          staff.staff_id.trim()
                            ? "classes-table__staff-id"
                            : "classes-table__staff-id is-muted"
                        }
                      >
                        {formatStaffLoginId(staff.staff_id)}
                      </span>
                    </td>
                    <td>
                      <button
                        className="classes-table__name-link"
                        onClick={() => setDetailId(staff.id)}
                        type="button"
                      >
                        {staff.name}
                      </button>
                    </td>
                    <td>{staff.roleLabel}</td>
                    <td>{getEmploymentTypeLabel(staff.employment_type)}</td>
                    <td>{staff.has_nursery_teacher_license ? "あり" : "なし"}</td>
                    <td>
                      {formatStaffClassLabels(
                        getStaffClassAssignment(staff.id, classrooms),
                      )}
                    </td>
                    <td>
                      {formatStaffWorkAvailability(staff) || (
                        <span className="is-muted">未設定</span>
                      )}
                    </td>
                    <td>
                      {pendingInvite ? (
                        <span className="invite-pending-label">招待中</span>
                      ) : (
                        <button
                          className="secondary-button secondary-button--compact"
                          onClick={() => openInviteForStaff(staff)}
                          type="button"
                        >
                          招待
                        </button>
                      )}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </section>

      {saveError ? (
        <p className="form-error" role="alert">
          {saveError}
        </p>
      ) : null}

      <StaffDetailPanel
        classAssignment={
          selectedStaff
            ? getStaffClassAssignment(selectedStaff.id, classrooms)
            : null
        }
        staff={selectedStaff}
        onClose={() => setDetailId(null)}
        onEdit={() => {
          if (selectedStaff) openEdit(selectedStaff);
        }}
        onToggleActive={() => {
          void handleToggleActive();
        }}
      />

      {formModalOpen ? (
        <StaffFormModal
          classAssignment={
            editingStaff
              ? getStaffClassAssignment(editingStaff.id, classrooms)
              : undefined
          }
          mode={formModalMode}
          open={formModalOpen}
          initialValues={formInitialValues}
          onClose={() => setModalState(null)}
          onSave={(values) => {
            void handleSave(values);
          }}
        />
      ) : null}

      {inviteOpen ? (
        <div className="modal-backdrop" onClick={closeInvite} role="presentation">
          <div
            aria-labelledby="invite-modal-title"
            aria-modal="true"
            className="modal-panel modal-panel--compact"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="modal-panel__header">
              <h2 id="invite-modal-title">
                {inviteTargetStaff
                  ? `個人端末用の招待（${inviteTargetStaff.name}）`
                  : "個人端末用の招待"}
              </h2>
              <button
                aria-label="閉じる"
                className="modal-panel__close"
                onClick={closeInvite}
                type="button"
              >
                ×
              </button>
            </div>

            <form className="modal-form" onSubmit={handleInviteSubmit}>
              <p className="invite-intro">
                {inviteTargetStaff
                  ? `${inviteTargetStaff.name} さんが自分のスマホなどで使うための QR / URL です。職員IDとパスワードは本人が初回登録で設定します。園のタブレットからの操作は、登録後いつでも同じ職員IDで可能です。`
                  : "QR または URL を渡して、職員本人に職員IDとパスワードを設定してもらいます。"}
              </p>

              {inviteTargetStaff ? (
                <p className="form-field__hint">
                  対象: {inviteTargetStaff.name}（職員マスタに登録済み）
                </p>
              ) : (
                <label className="form-field" htmlFor="invite-admin-note">
                  <span>管理用メモ（任意）</span>
                  <input
                    id="invite-admin-note"
                    onChange={(event) =>
                      setInviteDraft((current) => ({
                        ...current,
                        adminNote: event.target.value,
                      }))
                    }
                    placeholder="例: 佐藤先生向け（一覧の目印用）"
                    type="text"
                    value={inviteDraft.adminNote}
                  />
                </label>
              )}

              <fieldset className="form-field--fieldset">
                <legend>招待方法</legend>
                <div className="invite-methods">
                  <label className="invite-methods__item">
                    <input
                      checked={inviteDraft.method === "qr"}
                      name="invite-method"
                      onChange={() =>
                        setInviteDraft((current) => ({ ...current, method: "qr" }))
                      }
                      type="radio"
                    />
                    <span>QR印刷（現場配布）</span>
                  </label>
                  <label className="invite-methods__item">
                    <input
                      checked={inviteDraft.method === "url"}
                      name="invite-method"
                      onChange={() =>
                        setInviteDraft((current) => ({ ...current, method: "url" }))
                      }
                      type="radio"
                    />
                    <span>招待URL（LINE などで共有）</span>
                  </label>
                </div>
              </fieldset>

              <label className="form-field" htmlFor="invite-expiry">
                <span>有効期限</span>
                <select
                  id="invite-expiry"
                  onChange={(event) =>
                    setInviteDraft((current) => ({
                      ...current,
                      expiryHours: Number(event.target.value),
                    }))
                  }
                  value={inviteDraft.expiryHours}
                >
                  {INVITATION_EXPIRY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              {inviteError ? <span className="field-error">{inviteError}</span> : null}

              {latestInvitation ? (
                <div className="invite-result">
                  <p className="invite-result__title">発行済み</p>
                  <p className="invite-result__line">
                    {latestInvitation.method === "qr"
                      ? "QRを印刷して渡すか、画面を見せて登録してもらってください。"
                      : "URLを共有して登録してもらってください。"}
                  </p>
                  <p className="invite-result__line">
                    URL: <span>{latestInvitation.inviteUrl}</span>
                  </p>
                  {latestInvitation.method === "qr" ? (
                    <div aria-hidden="true" className="invite-qr-placeholder">
                      QR
                    </div>
                  ) : null}
                  <div className="invite-result__actions">
                    <button
                      className="secondary-button"
                      onClick={() => handleCopyUrl(latestInvitation.inviteUrl)}
                      type="button"
                    >
                      URLをコピー
                    </button>
                    {latestInvitation.method === "qr" ? (
                      <button
                        className="secondary-button"
                        onClick={() => window.print()}
                        type="button"
                      >
                        QRを印刷
                      </button>
                    ) : null}
                  </div>
                  {copyMessage ? (
                    <p className="form-field__hint">{copyMessage}</p>
                  ) : null}
                </div>
              ) : null}

              <div className="modal-form__actions">
                <button className="secondary-button" onClick={closeInvite} type="button">
                  キャンセル
                </button>
                <button className="primary-button" type="submit">
                  招待を発行
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

