"use client";

// メールアドレスでの本人確認フォーム（共通部品）─ マジックリンク方式。
// 「新規登録」と「ログイン」で同じ仕組みを使うので、mode で出し分けます。
//
// 流れ：
//   ① メールアドレスを入力 → 送信すると、そのアドレス宛に「ログイン用リンク」が届く
//   ② 届いたメールのリンクをクリック → /auth/callback に戻ってきて本人確認が完了する
//   ③ 本人確認できたら（callback側で）members テーブルに行を用意する
//
// 使っているSupabaseの機能：
//   signInWithOtp() … メールにログイン用リンク（マジックリンク）を送る
// ※ リンクの有効期限・連続送信の制限などは、Supabase側が標準で行います。

import { useState } from "react";
import Link from "next/link";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

type Mode = "login" | "register";

// 画面の段階：メール入力 → 送信完了（メール確認の案内）
type Step = "email" | "sent";

export default function AuthForm({ mode }: { mode: Mode }) {
  const isRegister = mode === "register";

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ① ログイン用リンクを送る --------------------------------------------
  const sendLink = async () => {
    setError("");

    if (!isSupabaseConfigured) {
      setError("Supabaseの接続設定（.env.local）がまだ空です。");
      return;
    }
    const cleanEmail = email.trim();
    if (cleanEmail === "") {
      setError("メールアドレスを入力してください。");
      return;
    }

    setLoading(true);
    // emailRedirectTo: リンクをクリックしたあとに戻ってくる自分のサイトのURL。
    //   届いたリンク → Supabase → このURL（/auth/callback）の順で戻ってきます。
    // shouldCreateUser:
    //   新規登録 → true（まだ登録の無いメールでも受け付ける）
    //   ログイン → false（登録済みの人だけ。未登録ならエラーにする）
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: cleanEmail,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        shouldCreateUser: isRegister,
      },
    });
    setLoading(false);

    if (otpError) {
      // ログインなのに未登録だった場合などをやさしく案内する
      if (!isRegister && /signups? not allowed|not found/i.test(otpError.message)) {
        setError("このメールアドレスの登録が見つかりません。新規登録からお進みください。");
      } else {
        setError(otpError.message);
      }
      return;
    }

    setStep("sent"); // 「メールを送りました」の案内へ
  };

  // 入力欄やボタンの共通スタイル
  const inputClass =
    "w-full rounded-xl border border-zinc-300 px-4 py-3 text-center text-base text-zinc-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200";
  const primaryBtn =
    "w-full rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-zinc-300 sm:text-base";

  return (
    <div className="flex flex-1 flex-col bg-zinc-100">
      {/* ヘッダー（前作と同じ見た目） */}
      <header className="shrink-0 border-b border-zinc-200 bg-white px-4 py-4 shadow-sm">
        <h1 className="mx-auto max-w-2xl text-center text-lg font-bold text-zinc-900 sm:text-xl">
          山田工務店 会員ページ
        </h1>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <section className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-sm sm:p-8">
          <h2 className="text-xl font-bold text-zinc-900 sm:text-2xl">
            {isRegister ? "新規登録" : "ログイン"}
          </h2>

          {/* === ① メール入力 === */}
          {step === "email" && (
            <div className="mt-6 flex flex-col gap-4">
              <p className="text-sm leading-relaxed text-zinc-600">
                メールアドレスを入力してください。
                <br />
                ログイン用のリンクをお送りします。
              </p>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="taro@example.com"
                className={inputClass}
                onKeyDown={(e) => e.key === "Enter" && sendLink()}
              />
              <button onClick={sendLink} disabled={loading} className={primaryBtn}>
                {loading ? "送信中…" : "ログイン用リンクを送る"}
              </button>
            </div>
          )}

          {/* === ② 送信完了の案内 === */}
          {step === "sent" && (
            <div className="mt-6 flex flex-col gap-4">
              <p className="rounded-xl bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">
                📧 メールを送りました
              </p>
              <p className="text-sm leading-relaxed text-zinc-600">
                <span className="font-semibold text-zinc-800">{email}</span>
                <br />
                宛にログイン用リンクを送りました。
                <br />
                メールを開いて、リンクをクリックしてください。
                <br />
                自動でこのサイトに戻り、本人確認が完了します。
              </p>
              <button
                onClick={() => {
                  setStep("email");
                  setError("");
                }}
                className="text-xs text-zinc-400 underline"
              >
                メールアドレスを入力し直す
              </button>
            </div>
          )}

          {/* エラー表示 */}
          {error && (
            <p className="mt-4 rounded-lg bg-orange-100 px-4 py-3 text-xs leading-relaxed text-orange-700">
              {error}
            </p>
          )}

          {/* 入口の切り替えリンク */}
          <p className="mt-6 text-xs text-zinc-400">
            {isRegister ? (
              <>
                登録済みの方は{" "}
                <Link href="/login" className="text-blue-600 underline">
                  ログイン
                </Link>
              </>
            ) : (
              <>
                はじめての方は{" "}
                <Link href="/register" className="text-blue-600 underline">
                  新規登録
                </Link>
              </>
            )}
          </p>
        </section>
      </main>

      <footer className="shrink-0 border-t border-zinc-200 bg-white px-4 py-3 text-center text-xs text-zinc-400">
        山田工務店 会員ページ ／ デモ用サンプル
      </footer>
    </div>
  );
}
