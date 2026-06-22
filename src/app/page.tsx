// 山田工務店 会員ページの入口（トップ画面）。
// 「新規登録」と「ログイン」の2つのボタンを置きます。
// ボタンは次のレッスンで作る画面（/register ・ /login）へのリンクです。
// （その画面はまだ無いので、今押すと404になりますが、それで問題ありません）

import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-zinc-100">
      {/* 上部のタイトル（前作のボットと同じ見た目） */}
      <header className="shrink-0 border-b border-zinc-200 bg-white px-4 py-4 shadow-sm">
        <h1 className="mx-auto max-w-2xl text-center text-lg font-bold text-zinc-900 sm:text-xl">
          山田工務店 会員ページ
        </h1>
      </header>

      {/* 中身：画面の中央に入口カードを置く */}
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <section className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-sm sm:p-8">
          {/* あいさつ */}
          <p className="text-2xl font-bold text-zinc-900 sm:text-3xl">
            ようこそ、山田工務店へ
          </p>

          {/* 案内文 */}
          <p className="mt-3 text-sm leading-relaxed text-zinc-600 sm:text-base">
            会員登録すると、リフォームのお見積もり依頼やご相談ができ、
            過去の問い合わせ履歴もいつでも確認できます。
          </p>

          {/* ボタン2つ（スマホでは縦、PCでは横に並ぶ） */}
          <div className="mt-7 flex flex-col gap-3">
            {/* 新規登録：目立つ塗りつぶしボタン */}
            <Link
              href="/register"
              className="rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 sm:text-base"
            >
              新規登録（はじめての方）
            </Link>

            {/* ログイン：枠線ボタン */}
            <Link
              href="/login"
              className="rounded-full border border-blue-600 px-6 py-3 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-50 sm:text-base"
            >
              ログイン（登録済みの方）
            </Link>
          </div>

          {/* 補足 */}
          <p className="mt-6 text-xs leading-relaxed text-zinc-400">
            ご登録・ログインはメールアドレスで行います。
            <br />
            パスワードは不要です。
          </p>
        </section>
      </main>

      {/* 下部 */}
      <footer className="shrink-0 border-t border-zinc-200 bg-white px-4 py-3 text-center text-xs text-zinc-400">
        山田工務店 会員ページ ／ デモ用サンプル
      </footer>
    </div>
  );
}
