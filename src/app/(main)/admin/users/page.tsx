import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { DeleteButton } from "@/components/delete-button";
import { createUserAccount, deleteUserAction } from "@/actions/admin";
import { roleTitle } from "@/lib/access";

export default async function AdminUsersPage() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">User accounts</h1>
        <p className="mt-1 text-sm text-muted">Provision role-based access for operators, purchasing, production, and admins.</p>
      </div>

      <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Create user</h2>
        <ActionForm action={createUserAccount} className="mt-4 grid gap-3 md:max-w-xl">
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="name">
              Name
            </label>
            <input
              id="name"
              name="name"
              required
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
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
              required
              minLength={6}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="role">
              Role
            </label>
            <select id="role" name="role" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
              <option value="USER">User</option>
              <option value="PURCHASING">Purchasing officer</option>
              <option value="PRODUCTION">Production manager</option>
              <option value="ADMIN">Administrator</option>
            </select>
          </div>
          <button
            type="submit"
            className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Create account
          </button>
        </ActionForm>
      </section>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-border bg-accent-muted/40 text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3 font-medium">{u.name}</td>
                <td className="px-4 py-3 text-xs text-muted">{u.email}</td>
                <td className="px-4 py-3 text-xs">{roleTitle(u.role)}</td>
                <td className="px-4 py-3">
                  {u.id === session.id ? (
                    <span className="text-xs text-muted">You</span>
                  ) : (
                    <DeleteButton
                      id={u.id}
                      action={deleteUserAction}
                      confirmMessage={`Delete user ${u.email}?`}
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
