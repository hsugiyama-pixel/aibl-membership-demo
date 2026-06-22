"use client";

// Supabase との接続確認用のテストページ。 URL は /test です。
// 鍵が .env.local に入っているか、そして Supabase に実際につながるかを画面で確認します。
// （会員ページ本体とは関係のない、開発中の動作チェック専用ページです）

import { useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export default function TestPage() {
  // 接続テストの状態。
  // 鍵が未入力なら最初から「error」、入っていれば「確認中…」から始める。
  const [status, setStatus] = useState<"checking" | "ok" | "error">(
    isSupabaseConfigured ? "checking" : "error",
  );
  const [detail, setDetail] = useState(
    isSupabaseConfigured
      ? ""
      : ".env.local の値が空です。URLとキーを貼り付けてください。",
  );

  useEffect(() => {
    // 鍵が未入力のときは、上の初期値のまま何もしない。
    if (!isSupabaseConfigured) return;

    // 鍵が入っていれば、Supabase に軽い問い合わせをして接続を確かめる。
    // auth.getSession() はテーブルが無くても呼べるので、接続チェックに向いています。
    supabase.auth
      .getSession()
      .then(({ error }) => {
        if (error) {
          setStatus("error");
          setDetail(error.message);
        } else {
          setStatus("ok");
          setDetail("Supabase への接続に成功しました。");
        }
      })
      .catch((e) => {
        setStatus("error");
        setDetail(String(e));
      });
  }, []);

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-100 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-sm">
        <h1 className="text-lg font-bold text-zinc-900">Supabase 接続テスト</h1>

        {/* 状態を色つきで表示 */}
        <div className="mt-5">
          {status === "checking" && (
            <p className="rounded-lg bg-zinc-100 px-4 py-3 text-sm text-zinc-500">
              確認中…
            </p>
          )}
          {status === "ok" && (
            <p className="rounded-lg bg-green-100 px-4 py-3 text-sm font-semibold text-green-700">
              ✅ 接続OK
            </p>
          )}
          {status === "error" && (
            <p className="rounded-lg bg-orange-100 px-4 py-3 text-sm font-semibold text-orange-700">
              ⚠️ まだ接続できていません
            </p>
          )}
        </div>

        {/* 補足メッセージ */}
        <p className="mt-3 text-xs leading-relaxed text-zinc-500">{detail}</p>

        <p className="mt-6 text-xs text-zinc-400">
          このページは接続確認用です。確認できたら削除して構いません。
        </p>
      </div>
    </div>
  );
}
