import { loginAction } from "@/actions/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-sm">
        <h1 className="text-xl font-semibold tracking-tight">Sign in</h1>
        <p className="mt-2 text-sm text-muted">
          Manufacturing ERP — demo password <code className="text-foreground">demo123</code>
        </p>

        <form action={loginAction} method="post" className="mt-6 space-y-4">
          {error ? (
            <p className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-200">
              {error}
            </p>
          ) : null}
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              required
              defaultValue="admin@demo.com"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none ring-accent focus:ring-2"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              defaultValue="demo123"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none ring-accent focus:ring-2"
            />
          </div>
          <button
            type="submit"
            className="flex w-full items-center justify-center rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Continue
          </button>
        </form>

        <div className="mt-6 rounded-md bg-accent-muted/40 p-3 text-xs text-muted">
          <div className="font-semibold text-foreground">Demo users</div>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>admin@demo.com — full access</li>
            <li>purchasing@demo.com — vendors &amp; POs</li>
            <li>production@demo.com — BOMs &amp; work orders</li>
            <li>user@demo.com — read-focused</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
