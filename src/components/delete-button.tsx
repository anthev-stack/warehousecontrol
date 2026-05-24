"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";

export function DeleteButton({
  id,
  action,
  label = "Delete",
  confirmMessage,
  className,
}: {
  id: string;
  action: (formData: FormData) => Promise<void>;
  label?: string;
  confirmMessage: string;
  className?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <div className={className} onClick={(e) => e.stopPropagation()}>
      {error ? <p className="mb-1 text-xs text-red-600 dark:text-red-300">{error}</p> : null}
      <form
        action={async (formData) => {
          if (!window.confirm(confirmMessage)) return;
          setError(null);
          setPending(true);
          try {
            await action(formData);
            router.refresh();
          } catch (e) {
            if (isRedirectError(e)) throw e;
            setError(e instanceof Error ? e.message : "Delete failed.");
          } finally {
            setPending(false);
          }
        }}
      >
        <input type="hidden" name="id" value={id} />
        <button
          type="submit"
          disabled={pending}
          className="rounded-md border border-red-500/40 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-500/10 disabled:opacity-50 dark:text-red-200"
        >
          {pending ? "Deleting…" : label}
        </button>
      </form>
    </div>
  );
}
