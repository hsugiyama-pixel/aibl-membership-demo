"use client";

// マジックリンクをクリックして戻ってくる先のページ（/auth/callback）。
//
// 仕組み：
//   メールのリンク → Supabase → このページ、の順で戻ってきます。
//   このとき、URLにログイン情報が含まれた状態で開かれ、
//   Supabaseクライアントが自動でそれを読み取ってログイン状態にしてくれます。
//   その「ログインできた」タイミングを検知して、
//   members テーブルに自分の行を用意し、「✅ 本人確認ができました」を表示します。

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { Session } from "@supabase/supabase-js";

type Status = "checking" | "done" | "error";

export default function AuthCallbackPage() {
  const [status, setStatus] = useState<Status>("checking");
  const [email, setEmail] = useState("");

  useEffect(() => {
    let active = true; // 画面を離れたあとに状態を変えないための目印

    // ログインが成立したら呼ぶ処理：members テーブルに自分の行を用意する
    const finish = async (session: Session | null) => {
      const userEmail = session?.user?.email;
      if (!userEmail) return;

      // すでに行があれば、そのまま使う（中身は上書きしない）
      const { error } = await supabase
        .from("members")
        .upsert(
          { email: userEmail },
          { onConflict: "email", ignoreDuplicates: true },
        );

      if (!active) return;
      if (error) {
        setEmail(userEmail);
        setStatus("error");
        return;
      }
      setEmail(userEmail);
      setStatus("done");
    };

    // ① すでにログイン情報が読み取れていれば、それを使う
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) finish(data.session);
    });

    // ② リンクから戻った直後にログインが成立する場合に備えて、変化も監視する
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) finish(session);
    });

    // ③ 一定時間たってもログインできなければ、エラー表示にする（リンク期限切れなど）
    const timer = setTimeout(() => {
      if (active) setStatus((s) => (s === "checking" ? "error" : s));
    }, 8000);

    return () => {
      active = false;
      sub.subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  const primaryBtn =
    "inline-block w-full rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 sm:text-base";

  return (
    <div className="flex flex-1 flex-col bg-zinc-100">
      <header className="shrink-0 border-b border-zinc-200 bg-white px-4 py-4 shadow-sm">
        <h1 className="mx-auto max-w-2xl text-center text-lg font-bold text-zinc-900 sm:text-xl">
          山田工務店 会員ページ
        </h1>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <section className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-sm sm:p-8">
          {/* 確認中 */}
          {status === "checking" && (
            <>
              <h2 className="text-xl font-bold text-zinc-900">本人確認中…</h2>
              <p className="mt-4 rounded-lg bg-zinc-100 px-4 py-3 text-sm text-zinc-500">
                少々お待ちください。
              </p>
            </>
          )}

          {/* 成功 */}
          {status === "done" && (
            <>
              <h2 className="text-xl font-bold text-zinc-900">ログイン完了</h2>
              <p className="mt-6 rounded-xl bg-green-100 px-4 py-3 text-sm font-semibold text-green-700">
                ✅ 本人確認ができました
              </p>
              <p className="mt-3 text-sm leading-relaxed text-zinc-600">
                {email} でログインしました。
                <br />
                つづけて会員情報のご登録にお進みください。
              </p>
              <div className="mt-6 flex flex-col gap-3">
                <Link href="/onboarding" className={primaryBtn}>
                  会員登録を進める
                </Link>
                <Link href="/" className="text-xs text-zinc-400 underline">
                  トップへ戻る
                </Link>
              </div>
            </>
          )}

          {/* 失敗 */}
          {status === "error" && (
            <>
              <h2 className="text-xl font-bold text-zinc-900">確認できませんでした</h2>
              <p className="mt-6 rounded-xl bg-orange-100 px-4 py-3 text-sm font-semibold text-orange-700">
                ⚠️ 本人確認ができませんでした
              </p>
              <p className="mt-3 text-sm leading-relaxed text-zinc-600">
                リンクの有効期限が切れているか、すでに使用済みの可能性があります。
                <br />
                お手数ですが、もう一度お試しください。
              </p>
              <div className="mt-6 flex flex-col gap-3">
                <Link href="/login" className={primaryBtn}>
                  ログインからやり直す
                </Link>
                <Link href="/" className="text-xs text-zinc-400 underline">
                  トップへ戻る
                </Link>
              </div>
            </>
          )}
        </section>
      </main>

      <footer className="shrink-0 border-t border-zinc-200 bg-white px-4 py-3 text-center text-xs text-zinc-400">
        山田工務店 会員ページ ／ デモ用サンプル
      </footer>
    </div>
  );
}
