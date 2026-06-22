"use client";

// 会員のお問い合わせページ（/inquiry）。
//
// できること：
//   ・登録完了した会員が、質問やクレームを送信できる
//   ・送信内容をキーワードで自動分類（見積依頼／予約・相談／クレーム／その他）
//   ・誰が送ったか（メールアドレス）とひもづけて inquiries テーブルに保存
//   ・自分が過去に送ったものだけを一覧表示（RLSで自分の行だけ取得）

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { classify, IMPORTANT_CATEGORY, type Category } from "@/lib/classify";

// 一覧表示用の型
type Inquiry = {
  id: number;
  body: string;
  category: Category;
  created_at: string;
};

type Phase = "loading" | "needLogin" | "needRegister" | "ready";

export default function InquiryPage() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [email, setEmail] = useState("");
  const [list, setList] = useState<Inquiry[]>([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const bottomRef = useRef<HTMLDivElement>(null);

  // 最初に1回：ログイン状態・登録完了状態・過去の問い合わせを読み込む
  useEffect(() => {
    let active = true;

    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const userEmail = sessionData.session?.user?.email;

      if (!userEmail) {
        if (active) setPhase("needLogin");
        return;
      }

      // 登録が完了しているか確認する
      const { data: member } = await supabase
        .from("members")
        .select("status")
        .eq("email", userEmail)
        .maybeSingle();

      if (!active) return;

      if (!member || member.status !== "completed") {
        setPhase("needRegister");
        return;
      }

      // 自分が過去に送った問い合わせを読み込む（新しい順）
      const { data: inquiries, error: readError } = await supabase
        .from("inquiries")
        .select("id, body, category, created_at")
        .eq("email", userEmail)
        .order("created_at", { ascending: false });

      if (!active) return;

      if (readError) {
        setError("履歴の読み込みでエラーが出ました：" + readError.message);
      }

      setEmail(userEmail);
      setList((inquiries as Inquiry[]) ?? []);
      setPhase("ready");
    })();

    return () => {
      active = false;
    };
  }, []);

  // 送信
  const send = async () => {
    const text = body.trim();
    if (text === "" || sending) return;
    setError("");

    // ① 自動分類
    const category = classify(text);

    setSending(true);

    // ② メールアドレスとひもづけて保存
    const { data: inserted, error: insertError } = await supabase
      .from("inquiries")
      .insert({ email, body: text, category })
      .select("id, body, category, created_at")
      .single();

    setSending(false);

    if (insertError) {
      setError("送信に失敗しました：" + insertError.message);
      return;
    }

    // ③ 画面の一覧の先頭に追加して、入力欄を空にする
    setList((prev) => [inserted as Inquiry, ...prev]);
    setBody("");
  };

  // 日時を読みやすく整形
  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="flex flex-1 flex-col bg-zinc-100">
      <header className="shrink-0 border-b border-zinc-200 bg-white px-4 py-4 shadow-sm">
        <h1 className="mx-auto max-w-2xl text-center text-lg font-bold text-zinc-900 sm:text-xl">
          山田工務店 会員ページ
        </h1>
        <p className="mx-auto mt-1 max-w-2xl text-center text-xs text-zinc-500">
          ご質問・ご相談・クレーム受付
        </p>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto flex max-w-2xl flex-col gap-4">
          {/* 読み込み中 */}
          {phase === "loading" && (
            <p className="rounded-2xl bg-white px-4 py-3 text-sm text-zinc-500 shadow-sm">
              読み込み中…
            </p>
          )}

          {/* 未ログイン */}
          {phase === "needLogin" && (
            <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
              <p className="text-sm text-zinc-600">
                お問い合わせにはログインが必要です。
              </p>
              <Link
                href="/login"
                className="mt-4 inline-block rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700"
              >
                ログインする
              </Link>
            </div>
          )}

          {/* 未登録（登録途中） */}
          {phase === "needRegister" && (
            <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
              <p className="text-sm leading-relaxed text-zinc-600">
                先に会員登録を完了してください。
              </p>
              <Link
                href="/onboarding"
                className="mt-4 inline-block rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700"
              >
                会員登録を進める
              </Link>
            </div>
          )}

          {/* 本体 */}
          {phase === "ready" && (
            <>
              <div className="flex items-start">
                <div className="max-w-[80%] rounded-2xl rounded-bl-sm bg-white px-4 py-2 text-sm leading-relaxed text-zinc-800 shadow-sm sm:text-base">
                  {email} 様、ご質問・ご相談・クレームなどをお送りください。
                  内容は自動で分類されます。
                </div>
              </div>

              {/* 履歴一覧 */}
              <h2 className="mt-2 text-center text-sm font-semibold text-zinc-500">
                これまでのお問い合わせ（{list.length}件）
              </h2>

              {list.length === 0 && (
                <p className="rounded-xl bg-white px-4 py-3 text-center text-sm text-zinc-400 shadow-sm">
                  まだお問い合わせはありません。
                </p>
              )}

              {list.map((item) => {
                const isImportant = item.category === IMPORTANT_CATEGORY;
                return (
                  <div
                    key={item.id}
                    className="rounded-xl bg-white px-4 py-3 shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                          isImportant
                            ? "bg-orange-100 text-orange-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {item.category}
                      </span>
                      <span className="text-[11px] text-zinc-400">
                        {formatDate(item.created_at)}
                      </span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-800">
                      {item.body}
                    </p>
                  </div>
                );
              })}

              {error && (
                <p className="rounded-lg bg-orange-100 px-4 py-3 text-xs leading-relaxed text-orange-700">
                  {error}
                </p>
              )}

              <div ref={bottomRef} />
            </>
          )}
        </div>
      </main>

      {/* 入力エリア（登録完了済みのときだけ表示） */}
      {phase === "ready" && (
        <footer className="shrink-0 border-t border-zinc-200 bg-white px-4 py-3">
          <form
            className="mx-auto flex max-w-2xl items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="ご質問・ご相談・クレームなどを入力してください"
              rows={2}
              className="flex-1 resize-none rounded-2xl border border-zinc-300 px-4 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 sm:text-base"
            />
            <button
              type="submit"
              disabled={sending || body.trim() === ""}
              className="shrink-0 rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-zinc-300 sm:text-base"
            >
              {sending ? "送信中…" : "送信"}
            </button>
          </form>
        </footer>
      )}
    </div>
  );
}
