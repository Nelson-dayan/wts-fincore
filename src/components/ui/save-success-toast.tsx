"use client";

type SaveSuccessToastProps = {
  message: string;
};

export function SaveSuccessToast({ message }: SaveSuccessToastProps) {
  if (!message) return null;

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[70] sm:right-6 sm:top-6">
      <div className="rounded-xl border border-emerald-500/45 bg-emerald-500/12 px-4 py-2.5 text-sm font-medium text-emerald-700 shadow-lg backdrop-blur dark:text-emerald-300">
        {message}
      </div>
    </div>
  );
}
