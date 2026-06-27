"use client";

export function SupportEndSessionButton() {
  return (
    <button
      type="submit"
      onClick={(event) => {
        const confirmed = window.confirm("End Support Session?\n\nYou will return to the Platform Dashboard.");
        if (!confirmed) {
          event.preventDefault();
        }
      }}
      className="min-h-11 rounded-lg bg-red-600 px-4 py-2 text-sm font-black text-white shadow-sm transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2"
    >
      End Support Session
    </button>
  );
}
