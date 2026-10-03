"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  CheckCircle2,
  Edit3,
  Link2,
  PauseCircle,
  PlayCircle,
  Settings2,
  Trash2,
  X,
} from "lucide-react";

type ManagedPlatform = {
  id: number;
  platform_name: string;
  platform_url: string | null;
  username: string | null;
  connection_status: string | null;
  last_link_changed_at: string | null;
};

type ManagedBranch = {
  id: number;
  name: string;
  status: "active" | "suspended";
  business_activity: string | null;
};

const PLATFORM_LABELS: Record<string, string> = {
  google_maps: "Google Maps",
  x: "X",
  tiktok: "TikTok",
  instagram: "Instagram",
};

function nextChangeDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  date.setMonth(date.getMonth() + 1);
  return date;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("ar-SA-u-nu-latn", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export default function BranchManager({
  branch,
  platforms,
}: {
  branch: ManagedBranch;
  platforms: ManagedPlatform[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(branch.name);
  const [activity, setActivity] = useState(branch.business_activity ?? "");
  const [links, setLinks] = useState<Record<number, string>>(() =>
    Object.fromEntries(
      platforms.map((platform) => [
        platform.id,
        platform.platform_name === "x"
          ? platform.username || platform.platform_url || ""
          : platform.platform_url || "",
      ])
    )
  );
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canDelete = useMemo(
    () => deleteConfirmation.trim() === branch.name.trim(),
    [branch.name, deleteConfirmation]
  );

  async function submit(payload: Record<string, unknown>, key: string) {
    setBusy(key);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/branches/${branch.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "تعذر حفظ التعديل");
      setMessage(data.message || "تم حفظ التعديل");
      router.refresh();
      return true;
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "تعذر حفظ التعديل"
      );
      return false;
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full border border-[#374375] bg-white px-5 py-3 text-sm font-bold text-[#374375] transition hover:bg-[#374375] hover:text-white"
      >
        <Settings2 size={18} />
        إدارة الفرع
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#1A1A2E]/45 p-0 sm:items-center sm:p-5">
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`إدارة ${branch.name}`}
            className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-[2rem] bg-[#F8F7F3] p-5 shadow-2xl sm:rounded-[2rem] sm:p-7"
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-[#895159]">إدارة الفرع</p>
                <h2 className="mt-1 text-2xl font-extrabold text-[#374375]">
                  {branch.name}
                </h2>
              </div>
              <button
                type="button"
                aria-label="إغلاق"
                onClick={() => setOpen(false)}
                className="rounded-full bg-white p-3 text-[#374375] shadow-sm"
              >
                <X size={20} />
              </button>
            </div>

            {(message || error) && (
              <div
                className={`mb-5 rounded-2xl px-4 py-3 text-sm font-bold ${
                  error
                    ? "bg-[#DFAEA1]/30 text-[#895159]"
                    : "bg-[#BABDE2]/30 text-[#374375]"
                }`}
              >
                {error || message}
              </div>
            )}

            <section className="rounded-3xl bg-white p-5">
              <div className="mb-4 flex items-center gap-2">
                <Edit3 size={19} className="text-[#374375]" />
                <h3 className="font-extrabold text-[#374375]">تعديل بيانات الفرع</h3>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-bold text-gray-600">
                  اسم الفرع
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-[#BABDE2]/60 bg-[#F8F7F3] px-4 py-3 outline-none focus:border-[#374375]"
                  />
                </label>
                <label className="text-sm font-bold text-gray-600">
                  نشاط الفرع
                  <input
                    value={activity}
                    onChange={(event) => setActivity(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-[#BABDE2]/60 bg-[#F8F7F3] px-4 py-3 outline-none focus:border-[#374375]"
                  />
                </label>
              </div>
              <button
                type="button"
                disabled={busy !== null || !name.trim() || !activity.trim()}
                onClick={() =>
                  submit(
                    { action: "update_details", name, businessActivity: activity },
                    "details"
                  )
                }
                className="mt-4 rounded-full bg-[#374375] px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                {busy === "details" ? "جارٍ الحفظ..." : "حفظ بيانات الفرع"}
              </button>
            </section>

            <section className="mt-5 rounded-3xl bg-white p-5">
              <div className="mb-4 flex items-center gap-2">
                <Link2 size={19} className="text-[#374375]" />
                <h3 className="font-extrabold text-[#374375]">روابط المنصات</h3>
              </div>

              {platforms.length === 0 ? (
                <p className="text-sm text-gray-500">لا توجد منصة مرتبطة بهذا الفرع.</p>
              ) : (
                <div className="space-y-4">
                  {platforms.map((platform) => {
                    const allowedAt = nextChangeDate(platform.last_link_changed_at);
                    const coolingDown = Boolean(allowedAt && allowedAt.getTime() > Date.now());
                    return (
                      <div key={platform.id} className="rounded-2xl bg-[#F8F7F3] p-4">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                          <p className="font-extrabold text-[#374375]">
                            {PLATFORM_LABELS[platform.platform_name] || platform.platform_name}
                          </p>
                          {coolingDown && allowedAt && (
                            <span className="text-xs font-bold text-[#895159]">
                              يمكنك التعديل مجددًا بتاريخ {formatDate(allowedAt)}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-col gap-3 sm:flex-row">
                          <input
                            value={links[platform.id] ?? ""}
                            disabled={branch.status !== "active" || coolingDown}
                            onChange={(event) =>
                              setLinks((current) => ({
                                ...current,
                                [platform.id]: event.target.value,
                              }))
                            }
                            className="min-w-0 flex-1 rounded-2xl border border-[#BABDE2]/60 bg-white px-4 py-3 text-sm outline-none disabled:opacity-60"
                          />
                          <button
                            type="button"
                            disabled={
                              busy !== null ||
                              branch.status !== "active" ||
                              coolingDown ||
                              !links[platform.id]?.trim()
                            }
                            onClick={() =>
                              submit(
                                {
                                  action: "rotate_platform_link",
                                  platformId: platform.id,
                                  platformValue: links[platform.id],
                                },
                                `platform-${platform.id}`
                              )
                            }
                            className="rounded-full bg-[#374375] px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
                          >
                            {busy === `platform-${platform.id}`
                              ? "جارٍ التغيير..."
                              : "تغيير الرابط"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="mt-5 rounded-3xl bg-white p-5">
              <div className="mb-3 flex items-center gap-2">
                <Archive size={19} className="text-[#374375]" />
                <h3 className="font-extrabold text-[#374375]">حالة الفرع</h3>
              </div>
              <p className="text-sm leading-7 text-gray-500">
                الإيقاف المؤقت يمنع المزامنة الجديدة ويحافظ على جميع البيانات والتقارير السابقة.
              </p>
              {branch.status === "active" ? (
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() =>
                    submit({ action: "set_status", status: "suspended" }, "suspend")
                  }
                  className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#DFAEA1]/35 px-5 py-3 text-sm font-bold text-[#895159] disabled:opacity-50"
                >
                  <PauseCircle size={18} />
                  {busy === "suspend" ? "جارٍ الإيقاف..." : "إيقاف الفرع مؤقتًا"}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() =>
                    submit({ action: "set_status", status: "active" }, "activate")
                  }
                  className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#374375] px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
                >
                  <PlayCircle size={18} />
                  {busy === "activate" ? "جارٍ التفعيل..." : "إعادة تفعيل الفرع"}
                </button>
              )}
            </section>

            <section className="mt-5 rounded-3xl border border-[#895159]/20 bg-[#DFAEA1]/15 p-5">
              <div className="flex items-center gap-2 text-[#895159]">
                <Trash2 size={19} />
                <h3 className="font-extrabold">حذف الفرع</h3>
              </div>
              <p className="mt-3 text-sm leading-7 text-[#895159]">
                ننصح أولًا بإيقاف الفرع مؤقتًا. الحذف يخفي الفرع نهائيًا ويوقف منصاته، مع الاحتفاظ بالتقارير والبيانات التاريخية.
              </p>
              <label className="mt-4 block text-sm font-bold text-[#895159]">
                للتأكيد اكتب اسم الفرع: {branch.name}
                <input
                  value={deleteConfirmation}
                  onChange={(event) => setDeleteConfirmation(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-[#895159]/25 bg-white px-4 py-3 outline-none"
                />
              </label>
              <button
                type="button"
                disabled={busy !== null || !canDelete}
                onClick={async () => {
                  const deleted = await submit(
                    { action: "set_status", status: "deleted" },
                    "delete"
                  );
                  if (deleted) setOpen(false);
                }}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#895159] px-5 py-3 text-sm font-bold text-white disabled:opacity-40"
              >
                {busy === "delete" ? (
                  "جارٍ الحذف..."
                ) : (
                  <>
                    <CheckCircle2 size={18} />
                    تأكيد الحذف الآمن
                  </>
                )}
              </button>
            </section>
          </div>
        </div>
      )}
    </>
  );
}
