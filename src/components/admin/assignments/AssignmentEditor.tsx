"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const TOPICS = ["dot", "projection", "angle", "vectors"] as const;
const DIFFICULTIES = ["easy", "medium", "hard"] as const;

function slugifyLite(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function Label({ children }: { children: any }) {
  return <div className="text-xs font-medium text-neutral-600">{children}</div>;
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={[
        "mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none",
        "focus:border-neutral-900 focus:ring-2 focus:ring-neutral-200",
        props.className ?? "",
      ].join(" ")}
    />
  );
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={[
        "mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none",
        "focus:border-neutral-900 focus:ring-2 focus:ring-neutral-200",
        props.className ?? "",
      ].join(" ")}
    />
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={[
        "mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none",
        "focus:border-neutral-900 focus:ring-2 focus:ring-neutral-200",
        props.className ?? "",
      ].join(" ")}
    />
  );
}

function Button({
  children,
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
}) {
  const cls =
    variant === "primary"
      ? "bg-black text-white hover:bg-neutral-800"
      : variant === "danger"
      ? "bg-red-600 text-white hover:bg-red-700"
      : "border border-neutral-300 hover:bg-neutral-50";
  return (
    <button
      {...props}
      className={[
        "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium",
        cls,
        props.disabled ? "opacity-50" : "",
        props.className ?? "",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export default function AssignmentEditor({
  mode,
  initialAssignment,
  sections,
}: {
  mode: "new" | "edit";
  initialAssignment: any | null;
  sections: Array<{ id: string; title: string; slug: string; topics: string[] }>;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [touchedSlug, setTouchedSlug] = useState(false);

  const [state, setState] = useState(() => {
    const a = initialAssignment;
    return {
      id: a?.id ?? null,
      status: a?.status ?? "draft",
      slug: a?.slug ?? "",
      title: a?.title ?? "",
      description: a?.description ?? "",

      sectionId: a?.sectionId ?? sections?.[0]?.id ?? "",
      topics: (a?.topics?.length ? a.topics : ["dot"]) as string[],
      difficulty: a?.difficulty ?? "easy",
      questionCount: a?.questionCount ?? 10,

      availableFrom: a?.availableFrom ? new Date(a.availableFrom).toISOString().slice(0, 16) : "",
      dueAt: a?.dueAt ? new Date(a.dueAt).toISOString().slice(0, 16) : "",
      timeLimitSec: a?.timeLimitSec ?? "",

      maxAttempts: a?.maxAttempts ?? "",
      allowReveal: Boolean(a?.allowReveal ?? false),
      showDebug: Boolean(a?.showDebug ?? false),
    };
  });

  // Auto-slug from title if user hasn’t touched slug
  useEffect(() => {
    if (!touchedSlug && state.title && !state.slug) {
      setState((s: any) => ({ ...s, slug: slugifyLite(s.title) }));
    }
  }, [state.title, touchedSlug, state.slug]);

  const selectedSection = useMemo(
    () => sections.find((s) => s.id === state.sectionId),
    [sections, state.sectionId]
  );

  // Constrain topics to section topics (if section has specific topics)
  useEffect(() => {
    if (!selectedSection?.topics?.length) return;
    setState((s: any) => {
      const allowed = new Set(selectedSection.topics);
      const nextTopics = (s.topics ?? []).filter((t: string) => allowed.has(t));
      return { ...s, topics: nextTopics.length ? nextTopics : [selectedSection.topics[0]] };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.sectionId]);

  async function save() {
    setErr(null);
    setBusy(true);
    try {
      const payload = {
        slug: state.slug,
        title: state.title,
        description: state.description || null,
        sectionId: state.sectionId,
        topics: state.topics,
        difficulty: state.difficulty,
        questionCount: Number(state.questionCount),
        availableFrom: state.availableFrom || null,
        dueAt: state.dueAt || null,
        timeLimitSec: state.timeLimitSec === "" ? null : Number(state.timeLimitSec),
        maxAttempts: state.maxAttempts === "" ? null : Number(state.maxAttempts),
        allowReveal: Boolean(state.allowReveal),
        showDebug: Boolean(state.showDebug),
      };

      if (mode === "new") {
        const res = await fetch("/api/admin/assignments", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error ?? "Failed to create");
        router.replace(`/admin/assignments/${json.assignment.id}`);
        router.refresh();
        return;
      }

      const res = await fetch(`/api/admin/assignments/${state.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to save");
      setState((s: any) => ({ ...s, status: json.assignment.status }));
      router.refresh();
    } catch (e: any) {
      setErr(e?.message ?? "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function publish() {
    if (!state.id) return;
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/assignments/${state.id}/publish`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to publish");
      setState((s: any) => ({ ...s, status: json.assignment.status }));
      router.refresh();
    } catch (e: any) {
      setErr(e?.message ?? "Publish failed");
    } finally {
      setBusy(false);
    }
  }

  async function unpublish() {
    if (!state.id) return;
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/assignments/${state.id}/unpublish`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to unpublish");
      setState((s: any) => ({ ...s, status: json.assignment.status }));
      router.refresh();
    } catch (e: any) {
      setErr(e?.message ?? "Unpublish failed");
    } finally {
      setBusy(false);
    }
  }

  async function destroy() {
    if (!state.id) return;
    if (!confirm("Delete this assignment? This cannot be undone.")) return;
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/assignments/${state.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to delete");
      router.replace("/admin/assignments");
      router.refresh();
    } catch (e: any) {
      setErr(e?.message ?? "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  const allowedTopics = selectedSection?.topics?.length ? selectedSection.topics : (TOPICS as any);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {mode === "new" ? "New Assignment" : "Edit Assignment"}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Status: <span className="font-medium text-neutral-900">{state.status}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {mode === "edit" && state.status !== "published" && (
            <Button onClick={publish} disabled={busy} variant="secondary">
              Publish
            </Button>
          )}
          {mode === "edit" && state.status === "published" && (
            <Button onClick={unpublish} disabled={busy} variant="secondary">
              Unpublish
            </Button>
          )}
          <Button onClick={save} disabled={busy}>
            {busy ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      {err && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {err}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input
                value={state.title}
                onChange={(e) => setState((s: any) => ({ ...s, title: e.target.value }))}
                placeholder="Module 0 — Dot Product Quiz 1"
              />
            </div>

            <div>
              <Label>Slug</Label>
              <Input
                value={state.slug}
                onChange={(e) => {
                  setTouchedSlug(true);
                  setState((s: any) => ({ ...s, slug: e.target.value }));
                }}
                placeholder="module-0-dot-quiz-1"
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                rows={5}
                value={state.description}
                onChange={(e) => setState((s: any) => ({ ...s, description: e.target.value }))}
                placeholder="Short instructions shown to students…"
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <div className="space-y-4">
            <div>
              <Label>Section</Label>
              <Select
                value={state.sectionId}
                onChange={(e) => setState((s: any) => ({ ...s, sectionId: e.target.value }))}
              >
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title} ({s.slug})
                  </option>
                ))}
              </Select>
              <div className="mt-1 text-xs text-neutral-500">
                Topics allowed: {selectedSection?.topics?.join(", ") ?? "all"}
              </div>
            </div>

            <div>
              <Label>Difficulty</Label>
              <Select
                value={state.difficulty}
                onChange={(e) => setState((s: any) => ({ ...s, difficulty: e.target.value }))}
              >
                {DIFFICULTIES.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label>Topics</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {allowedTopics.map((t: string) => {
                  const checked = state.topics.includes(t);
                  return (
                    <label
                      key={t}
                      className={[
                        "cursor-pointer select-none rounded-full border px-3 py-1 text-xs font-medium",
                        checked
                          ? "border-neutral-900 bg-neutral-900 text-white"
                          : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50",
                      ].join(" ")}
                    >
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={checked}
                        onChange={(e) => {
                          setState((s: any) => {
                            const next = new Set(s.topics);
                            if (e.target.checked) next.add(t);
                            else next.delete(t);
                            return { ...s, topics: Array.from(next) };
                          });
                        }}
                      />
                      {t}
                    </label>
                  );
                })}
              </div>
              <div className="mt-1 text-xs text-neutral-500">
                Pick at least one topic.
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Question Count</Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={state.questionCount}
                  onChange={(e) =>
                    setState((s: any) => ({ ...s, questionCount: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label>Time Limit (sec)</Label>
                <Input
                  type="number"
                  min={0}
                  value={state.timeLimitSec}
                  onChange={(e) =>
                    setState((s: any) => ({ ...s, timeLimitSec: e.target.value }))
                  }
                  placeholder="(optional)"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Available From</Label>
                <Input
                  type="datetime-local"
                  value={state.availableFrom}
                  onChange={(e) => setState((s: any) => ({ ...s, availableFrom: e.target.value }))}
                />
              </div>
              <div>
                <Label>Due At</Label>
                <Input
                  type="datetime-local"
                  value={state.dueAt}
                  onChange={(e) => setState((s: any) => ({ ...s, dueAt: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <Label>Max Attempts</Label>
              <Input
                type="number"
                min={0}
                value={state.maxAttempts}
                onChange={(e) => setState((s: any) => ({ ...s, maxAttempts: e.target.value }))}
                placeholder="(optional, blank = unlimited)"
              />
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={state.allowReveal}
                  onChange={(e) => setState((s: any) => ({ ...s, allowReveal: e.target.checked }))}
                />
                Allow reveal
              </label>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={state.showDebug}
                  onChange={(e) => setState((s: any) => ({ ...s, showDebug: e.target.checked }))}
                />
                Show debug
              </label>
            </div>
          </div>
        </div>
      </div>

      {mode === "edit" && (
        <div className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-5">
          <div>
            <div className="text-sm font-medium text-neutral-900">Danger zone</div>
            <div className="mt-1 text-xs text-neutral-500">
              Delete is blocked if the assignment has sessions (see API).
            </div>
          </div>
          <Button variant="danger" disabled={busy} onClick={destroy}>
            Delete
          </Button>
        </div>
      )}
    </div>
  );
}
