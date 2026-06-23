"use client";

type SectionEditPencilButtonProps = {
  onClick: () => void;
  label?: string;
};

export function SectionEditPencilButton({
  onClick,
  label = "編集",
}: SectionEditPencilButtonProps) {
  return (
    <button
      type="button"
      className="nursery-section-edit-btn"
      aria-label={label}
      title={label}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClick();
      }}
    >
      <svg
        aria-hidden="true"
        className="nursery-section-edit-btn__icon"
        fill="none"
        height="20"
        viewBox="0 0 24 24"
        width="20"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M4 20h4l10.5-10.5a2.12 2.12 0 0 0 0-3L17 3.5a2.12 2.12 0 0 0-3 0L3.5 14 4 20Z"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.75"
        />
        <path
          d="m13.5 6.5 4 4"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.75"
        />
      </svg>
    </button>
  );
}
