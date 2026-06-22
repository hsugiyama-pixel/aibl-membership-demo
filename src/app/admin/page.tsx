"use client";

// 管理画面（/admin）。関係者だけが合言葉で入れる簡易保護つき。
//
// 流れ：
//   ① 合言葉を入力 → サーバーAPI(/api/admin/inquiries)で照合
//   ② 正しければ全件データを受け取り、画面に表示
//   ③ 種別・国・地域・日付でしぼり込み、地域別の件数も集計する
//
// ※ 合言葉の正誤判定も、全件取得もサーバー側で行います。
//    合言葉が違うとデータは一切返ってこないので、誰でも見られる状態にはなりません。

import { useMemo, useState } from "react";
import { CATEGORIES, IMPORTANT_CATEGORY } from "@/lib/classify";

type Row = {
  id: number;
  email: string;
  body: string;
  category: string;
  created_at: string;
  country: string | null;
  region: string | null;
};

export default function AdminPage() {
  const [passcode, setPasscode] = useState("");
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rows, setRows] = useState<Row[]>([]);

  // しぼり込み条件
  const [fCategory, setFCategory] = useState("すべて");
  const [fCountry, setFCountry] = useState("すべて");
  const [fRegion, setFRegion] = useState("すべて");
  const [fFrom, setFFrom] = useState("");
  const [fTo, setFTo] = useState("");

  // ① 合言葉を送ってデータを取得
  const login = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "エラーが発生しました。");
        setLoading(false);
        return;
      }
      setRows(json.rows as Row[]);
      setAuthed(true);
    } catch {
      setError("通信に失敗しました。");
    }
    setLoading(false);
  };

  // しぼり込みの選択肢（実データから国・地域を集める）
  const countryOptions = useMemo(
    () => ["すべて", ...Array.from(new Set(rows.map((r) => r.country).filter(Boolean) as string[]))],
    [rows],
  );
  const regionOptions = useMemo(
    () => ["すべて", ...Array.from(new Set(rows.map((r) => r.region).filter(Boolean) as string[]))],
    [rows],
  );

  // しぼり込み後の一覧
  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (fCategory !== "すべて" && r.category !== fCategory) return false;
      if (fCountry !== "すべて" && r.country !== fCountry) return false;
      if (fRegion !== "すべて" && r.region !== fRegion) return false;
      const date = r.created_at.slice(0, 10); // YYYY-MM-DD
      if (fFrom && date < fFrom) return false;
      if (fTo && date > fTo) return false;
      return true;
    });
  }, [rows, fCategory, fCountry, fRegion, fFrom, fTo]);

  // 地域別の件数集計（しぼり込み後の一覧をもとに）
  const regionCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of filtered) {
      const key = r.region ?? "（未登録）";
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    // 件数の多い順に並べる
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

  const selectClass =
    "rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500";

  return (
    <div className="flex flex-1 flex-col bg-zinc-100">
      <header className="shrink-0 border-b border-zinc-200 bg-white px-4 py-4 shadow-sm">
        <h1 className="mx-auto max-w-4xl text-center text-lg font-bold text-zinc-900 sm:text-xl">
          山田工務店 会員ページ ─ 管理画面
        </h1>
      </header>

      {/* === 合言葉ゲート === */}
      {!authed && (
        <main className="flex flex-1 items-center justify-center px-4 py-10">
          <section className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-sm sm:p-8">
            <h2 className="text-lg font-bold text-zinc-900">管理者ログイン</h2>
            <p className="mt-2 text-sm text-zinc-500">
              合言葉を入力してください。
            </p>
            <input
              type="password"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && login()}
              placeholder="合言葉"
              className="mt-5 w-full rounded-xl border border-zinc-300 px-4 py-3 text-center text-base text-zinc-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
            <button
              onClick={login}
              disabled={loading || passcode === ""}
              className="mt-4 w-full rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-zinc-300 sm:text-base"
            >
              {loading ? "確認中…" : "入る"}
            </button>
            {error && (
              <p className="mt-4 rounded-lg bg-orange-100 px-4 py-3 text-xs text-orange-700">
                {error}
              </p>
            )}
          </section>
        </main>
      )}

      {/* === 管理画面本体 === */}
      {authed && (
        <main className="flex-1 overflow-y-auto px-4 py-6">
          <div className="mx-auto flex max-w-4xl flex-col gap-6">
            {/* しぼり込み */}
            <section className="rounded-2xl bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold text-zinc-700">しぼり込み</h2>
              <div className="flex flex-wrap items-end gap-3">
                <label className="flex flex-col gap-1 text-xs text-zinc-500">
                  種別
                  <select value={fCategory} onChange={(e) => setFCategory(e.target.value)} className={selectClass}>
                    <option>すべて</option>
                    {CATEGORIES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-xs text-zinc-500">
                  国
                  <select value={fCountry} onChange={(e) => setFCountry(e.target.value)} className={selectClass}>
                    {countryOptions.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-xs text-zinc-500">
                  地域
                  <select value={fRegion} onChange={(e) => setFRegion(e.target.value)} className={selectClass}>
                    {regionOptions.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-xs text-zinc-500">
                  日付（から）
                  <input type="date" value={fFrom} onChange={(e) => setFFrom(e.target.value)} className={selectClass} />
                </label>
                <label className="flex flex-col gap-1 text-xs text-zinc-500">
                  日付（まで）
                  <input type="date" value={fTo} onChange={(e) => setFTo(e.target.value)} className={selectClass} />
                </label>
                <button
                  onClick={() => {
                    setFCategory("すべて");
                    setFCountry("すべて");
                    setFRegion("すべて");
                    setFFrom("");
                    setFTo("");
                  }}
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50"
                >
                  クリア
                </button>
              </div>
            </section>

            {/* 地域別の件数集計 */}
            <section className="rounded-2xl bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold text-zinc-700">
                地域別の件数（しぼり込み後・全{filtered.length}件）
              </h2>
              {regionCounts.length === 0 ? (
                <p className="text-sm text-zinc-400">該当する件数はありません。</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {regionCounts.map(([region, count]) => (
                    <div
                      key={region}
                      className="flex min-w-[90px] flex-col items-center rounded-lg bg-zinc-100 px-3 py-2"
                    >
                      <span className="text-[11px] text-zinc-500">{region}</span>
                      <span className="text-lg font-bold text-zinc-900">{count}件</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* 一覧 */}
            <section className="rounded-2xl bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold text-zinc-700">
                お問い合わせ一覧（{filtered.length}件）
              </h2>
              <div className="flex flex-col gap-2">
                {filtered.length === 0 && (
                  <p className="text-sm text-zinc-400">該当するお問い合わせはありません。</p>
                )}
                {filtered.map((r) => {
                  const isImportant = r.category === IMPORTANT_CATEGORY;
                  return (
                    <div key={r.id} className="rounded-xl border border-zinc-100 px-4 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                              isImportant ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"
                            }`}
                          >
                            {r.category}
                          </span>
                          <span className="text-xs text-zinc-500">
                            {r.country ?? "—"} / {r.region ?? "—"}
                          </span>
                        </div>
                        <span className="text-[11px] text-zinc-400">{formatDate(r.created_at)}</span>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-800">{r.body}</p>
                      <p className="mt-1 text-[11px] text-zinc-400">{r.email}</p>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </main>
      )}

      <footer className="shrink-0 border-t border-zinc-200 bg-white px-4 py-3 text-center text-xs text-zinc-400">
        山田工務店 会員ページ ／ 管理画面
      </footer>
    </div>
  );
}
