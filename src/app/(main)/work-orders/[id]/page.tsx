import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { ActionForm } from "@/components/action-form";
import { DeleteButton } from "@/components/delete-button";
import {
  createWorkOrderTask,
  deleteWorkOrderAction,
  logTime,
  setTaskStatusForm,
  workOrderIntentAction,
} from "@/actions/work-orders";
import { productionListPath } from "@/lib/production-kind";

export default async function WorkOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [session, wo, users] = await Promise.all([
    getSession(),
    prisma.workOrder.findUnique({
      where: { id },
      include: {
        bom: { include: { finishedGood: true } },
        materials: { include: { part: true } },
        tasks: { include: { assignee: true }, orderBy: { sortOrder: "asc" } },
        timeEntries: { include: { user: true }, orderBy: { createdAt: "desc" }, take: 20 },
      },
    }),
    prisma.user.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!wo) notFound();

  const canPlan = session && (session.role === "ADMIN" || session.role === "PRODUCTION");
  const backHref = productionListPath();

  return (
    <div className="space-y-8">
      <div>
        <Link href={backHref} className="text-sm font-medium text-accent">
          ← Production
        </Link>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{wo.number}</h1>
            <p className="mt-1 text-sm text-muted">
              {wo.bom.name} · FG {wo.bom.finishedGood.sku} · Qty {wo.qty} ·{" "}
              <span className="font-medium text-foreground">{wo.status}</span>
            </p>
            {wo.notes ? <p className="mt-2 text-sm">{wo.notes}</p> : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {canPlan ? (
              <DeleteButton
                id={wo.id}
                action={deleteWorkOrderAction}
                confirmMessage={`Delete work order ${wo.number}?`}
              />
            ) : null}
            {canPlan ? (
              <>
                {wo.status === "DRAFT" ? (
                  <InlineWoAction label="Release" intent="release" id={wo.id} />
                ) : null}
                {wo.status === "RELEASED" || wo.status === "IN_PROGRESS" ? (
                  <InlineWoAction label="Issue materials / start" intent="start" id={wo.id} />
                ) : null}
                {wo.status === "IN_PROGRESS" ? (
                  <InlineWoAction label="Complete build" intent="complete" id={wo.id} />
                ) : null}
              </>
            ) : null}
          </div>
        </div>
      </div>

      <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Materials</h2>
        <p className="mt-1 text-xs text-muted">MRP nets demand from open work orders using these requirements.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="py-2 pr-4">Part</th>
                <th className="py-2 pr-4">Required</th>
                <th className="py-2 pr-4">Issued</th>
                <th className="py-2">On hand</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {wo.materials.map((m) => (
                <tr key={m.id}>
                  <td className="py-2 pr-4">
                    <div className="font-mono text-xs">{m.part.sku}</div>
                    <div className="text-xs text-muted">{m.part.name}</div>
                  </td>
                  <td className="py-2 pr-4 tabular-nums">{m.qtyRequired}</td>
                  <td className="py-2 pr-4 tabular-nums">{m.qtyIssued}</td>
                  <td className="py-2 tabular-nums">{m.part.onHand}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Production tasks</h2>
        {canPlan ? (
          <ActionForm action={createWorkOrderTask} className="mt-4 grid gap-3 md:grid-cols-2">
            <input type="hidden" name="workOrderId" value={wo.id} />
            <div className="space-y-1 md:col-span-2">
              <label className="text-sm font-medium" htmlFor="title">
                Title
              </label>
              <input
                id="title"
                name="title"
                required
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-sm font-medium" htmlFor="description">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                rows={2}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-sm font-medium" htmlFor="assigneeId">
                Assignee
              </label>
              <select
                id="assigneeId"
                name="assigneeId"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                defaultValue=""
              >
                <option value="">— unassigned —</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <button
                type="submit"
                className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
              >
                Add task
              </button>
            </div>
          </ActionForm>
        ) : null}

        <ul className="mt-4 space-y-3">
          {wo.tasks.map((t) => (
            <li key={t.id} className="rounded-md border border-border p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="font-medium">{t.title}</div>
                  {t.description ? <div className="text-sm text-muted">{t.description}</div> : null}
                  <div className="mt-1 text-xs text-muted">
                    Assigned: {t.assignee ? `${t.assignee.name}` : "Unassigned"}
                  </div>
                </div>
                <TaskActions taskId={t.id} status={t.status} />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Time &amp; labor</h2>
        <ActionForm action={logTime} className="mt-4 grid gap-3 md:grid-cols-2">
          <input type="hidden" name="workOrderId" value={wo.id} />
          <div className="space-y-1 md:col-span-2">
            <label className="text-sm font-medium" htmlFor="description">
              Work description
            </label>
            <input
              id="description"
              name="description"
              required
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="minutes">
              Minutes
            </label>
            <input
              id="minutes"
              name="minutes"
              type="number"
              required
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="laborRate">
              Labor rate ($/hr)
            </label>
            <input
              id="laborRate"
              name="laborRate"
              type="number"
              step="0.01"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="md:col-span-2">
            <button
              type="submit"
              className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              Log time
            </button>
          </div>
        </ActionForm>

        <ul className="mt-6 space-y-2 text-sm">
          {wo.timeEntries.map((te) => (
            <li key={te.id} className="flex flex-wrap justify-between gap-2 border-t border-border pt-3 first:border-t-0 first:pt-0">
              <div>
                <div className="font-medium">{te.description}</div>
                <div className="text-xs text-muted">
                  {te.user.name} · {te.minutes}m @ ${te.laborRate.toFixed(2)}/hr → est $
                  {((te.minutes / 60) * te.laborRate).toFixed(2)}
                </div>
              </div>
              <div className="text-xs text-muted">{te.createdAt.toLocaleString()}</div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function InlineWoAction({ label, intent, id }: { label: string; intent: string; id: string }) {
  return (
    <form action={workOrderIntentAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="intent" value={intent} />
      <button
        type="submit"
        className="rounded-md border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-accent-muted"
      >
        {label}
      </button>
    </form>
  );
}

function TaskActions({
  taskId,
  status,
}: {
  taskId: string;
  status: "TODO" | "IN_PROGRESS" | "DONE";
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {status !== "TODO" ? (
        <form action={setTaskStatusForm}>
          <input type="hidden" name="taskId" value={taskId} />
          <input type="hidden" name="status" value="TODO" />
          <button type="submit" className="rounded-md border border-border px-2 py-1 text-xs">
            Mark todo
          </button>
        </form>
      ) : null}
      {status !== "IN_PROGRESS" ? (
        <form action={setTaskStatusForm}>
          <input type="hidden" name="taskId" value={taskId} />
          <input type="hidden" name="status" value="IN_PROGRESS" />
          <button type="submit" className="rounded-md border border-border px-2 py-1 text-xs">
            In progress
          </button>
        </form>
      ) : null}
      {status !== "DONE" ? (
        <form action={setTaskStatusForm}>
          <input type="hidden" name="taskId" value={taskId} />
          <input type="hidden" name="status" value="DONE" />
          <button type="submit" className="rounded-md border border-border px-2 py-1 text-xs">
            Done
          </button>
        </form>
      ) : null}
    </div>
  );
}
