"use client";

// 会話形式の会員登録フロー（/onboarding）。
//
// 流れ：
//   本人確認（ログイン）が済んだ人が開くページ。
//   国 → 地域 → 性別 → 生まれた年 の順に、1問ずつチャット形式で質問します。
//   答えるたびに、その場で members テーブルに保存します（即保存）。
//   途中でやめても、同じメールアドレスでログインし直せば続きから再開できます。
//   全部答え終わったら status を completed（完了）にします。

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

// 質問の定義。order の順に1問ずつ進めます。
type StepType = "choice" | "text" | "year";
type Field = "country" | "region" | "gender" | "birth_year";

const STEPS: {
  field: Field;
  question: string;
  type: StepType;
  choices?: string[];
  placeholder?: string;
}[] = [
  {
    field: "country",
    question: "どちらの国にお住まいですか？",
    type: "choice",
    choices: ["日本", "アメリカ", "中国", "韓国", "その他"],
  },
  {
    field: "region",
    question: "地域（都道府県・州）はどちらですか？",
    type: "text",
    placeholder: "例：東京都",
  },
  {
    field: "gender",
    question: "性別を教えてください。",
    type: "choice",
    choices: ["男性", "女性", "その他", "回答しない"],
  },
  {
    field: "birth_year",
    question: "生まれた年（西暦）を教えてください。",
    type: "year",
    placeholder: "例：1990",
  },
];

// 会員データの形（登録フローで扱う項目だけ）
type MemberData = {
  country: string | null;
  region: string | null;
  gender: string | null;
  birth_year: number | null;
  status: string;
};

// 最初に未回答の項目が何番目かを返す（=再開位置）
function firstUnansweredIndex(data: MemberData): number {
  for (let i = 0; i < STEPS.length; i++) {
    const value = data[STEPS[i].field];
    if (value === null || value === "") return i;
  }
  return STEPS.length; // 全部回答済み
}

type Phase = "loading" | "needLogin" | "asking" | "done";

export default function OnboardingPage() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [email, setEmail] = useState("");
  const [data, setData] = useState<MemberData | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [textInput, setTextInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // 会話が増えたら一番下までスクロール
  const bottomRef = useRef<HTMLDivElement>(null);

  // 最初に1回：ログイン状態と、現在の会員データを読み込む
  useEffect(() => {
    let active = true;

    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const userEmail = sessionData.session?.user?.email;

      if (!userEmail) {
        if (active) setPhase("needLogin");
        return;
      }

      // 自分の会員データを読み込む（RLSで自分の行だけ取得できる）
      const { data: member, error: readError } = await supabase
        .from("members")
        .select("country, region, gender, birth_year, status")
        .eq("email", userEmail)
        .maybeSingle();

      if (!active) return;

      if (readError) {
        setError("会員データの読み込みでエラーが出ました：" + readError.message);
        setPhase("asking");
        return;
      }

      // 万一行が無ければ作っておく（通常は本人確認時に作成済み）
      const current: MemberData =
        member ??
        ({
          country: null,
          region: null,
          gender: null,
          birth_year: null,
          status: "in_progress",
        } as MemberData);

      if (!member) {
        await supabase.from("members").upsert(
          { email: userEmail },
          { onConflict: "email", ignoreDuplicates: true },
        );
      }

      setEmail(userEmail);
      setData(current);

      const next = firstUnansweredIndex(current);
      setStepIndex(next);
      setPhase(next >= STEPS.length ? "done" : "asking");
    })();

    return () => {
      active = false;
    };
  }, []);

  // 会話が更新されたら自動スクロール
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [stepIndex, phase, saving]);

  // 1問ぶんの回答を保存して次へ進む
  const saveAnswer = async (rawValue: string) => {
    if (!data) return;
    const step = STEPS[stepIndex];
    setError("");

    // 入力チェック
    let valueToSave: string | number;
    if (step.type === "year") {
      const year = Number(rawValue);
      const thisYear = new Date().getFullYear();
      if (!Number.isInteger(year) || year < 1900 || year > thisYear) {
        setError(`1900〜${thisYear} の範囲で、西暦の数字を入力してください。`);
        return;
      }
      valueToSave = year;
    } else {
      const text = rawValue.trim();
      if (text === "") {
        setError("入力してください。");
        return;
      }
      valueToSave = text;
    }

    setSaving(true);

    // この回答が最後の質問なら、status も completed にする
    const isLast = stepIndex === STEPS.length - 1;
    const updatePayload: Record<string, string | number> = {
      [step.field]: valueToSave,
    };
    if (isLast) updatePayload.status = "completed";

    const { error: saveError } = await supabase
      .from("members")
      .update(updatePayload)
      .eq("email", email);

    setSaving(false);

    if (saveError) {
      setError("保存に失敗しました：" + saveError.message);
      return;
    }

    // 画面側のデータも更新して次の質問へ
    const newData: MemberData = {
      ...data,
      [step.field]: valueToSave,
      status: isLast ? "completed" : data.status,
    };
    setData(newData);
    setTextInput("");

    if (isLast) {
      setPhase("done");
    } else {
      setStepIndex(stepIndex + 1);
    }
  };

  // 表示用：これまでのやり取り（回答済みの質問と答え）を組み立てる
  const history = data
    ? STEPS.slice(0, stepIndex).map((step) => ({
        question: step.question,
        answer: String(data[step.field] ?? ""),
      }))
    : [];

  const currentStep =
    phase === "asking" && stepIndex < STEPS.length ? STEPS[stepIndex] : null;

  return (
    <div className="flex flex-1 flex-col bg-zinc-100">
      <header className="shrink-0 border-b border-zinc-200 bg-white px-4 py-4 shadow-sm">
        <h1 className="mx-auto max-w-2xl text-center text-lg font-bold text-zinc-900 sm:text-xl">
          山田工務店 会員ページ
        </h1>
        <p className="mx-auto mt-1 max-w-2xl text-center text-xs text-zinc-500">
          会員登録（あと{Math.max(STEPS.length - stepIndex, 0)}問）
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
                会員登録を続けるにはログインが必要です。
              </p>
              <Link
                href="/login"
                className="mt-4 inline-block rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700"
              >
                ログインする
              </Link>
            </div>
          )}

          {/* あいさつ（質問中・完了どちらでも先頭に出す） */}
          {(phase === "asking" || phase === "done") && (
            <div className="flex items-start">
              <div className="max-w-[80%] rounded-2xl rounded-bl-sm bg-white px-4 py-2 text-sm leading-relaxed text-zinc-800 shadow-sm sm:text-base">
                {email} 様、ようこそ。会員情報をお聞きします。
              </div>
            </div>
          )}

          {/* これまでのやり取り */}
          {history.map((h, i) => (
            <div key={i} className="flex flex-col gap-4">
              {/* 質問（左・AI側） */}
              <div className="flex items-start">
                <div className="max-w-[80%] rounded-2xl rounded-bl-sm bg-white px-4 py-2 text-sm leading-relaxed text-zinc-800 shadow-sm sm:text-base">
                  {h.question}
                </div>
              </div>
              {/* 回答（右・ユーザー側） */}
              <div className="flex items-end justify-end">
                <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-blue-600 px-4 py-2 text-sm leading-relaxed text-white shadow-sm sm:text-base">
                  {h.answer}
                </div>
              </div>
            </div>
          ))}

          {/* 現在の質問 */}
          {currentStep && (
            <div className="flex items-start">
              <div className="max-w-[80%] rounded-2xl rounded-bl-sm bg-white px-4 py-2 text-sm leading-relaxed text-zinc-800 shadow-sm sm:text-base">
                {currentStep.question}
              </div>
            </div>
          )}

          {/* 完了メッセージ */}
          {phase === "done" && (
            <div className="flex items-start">
              <div className="max-w-[80%] rounded-2xl rounded-bl-sm bg-green-100 px-4 py-3 text-sm font-semibold leading-relaxed text-green-700 shadow-sm sm:text-base">
                ✅ 会員登録が完了しました。ありがとうございます！
              </div>
            </div>
          )}

          {error && (
            <p className="rounded-lg bg-orange-100 px-4 py-3 text-xs leading-relaxed text-orange-700">
              {error}
            </p>
          )}

          <div ref={bottomRef} />
        </div>
      </main>

      {/* 入力エリア（質問の種類で出し分け） */}
      <footer className="shrink-0 border-t border-zinc-200 bg-white px-4 py-3">
        <div className="mx-auto max-w-2xl">
          {/* 選択式 */}
          {currentStep?.type === "choice" && (
            <div className="flex flex-wrap justify-center gap-2">
              {currentStep.choices!.map((choice) => (
                <button
                  key={choice}
                  onClick={() => saveAnswer(choice)}
                  disabled={saving}
                  className="rounded-full border border-blue-600 px-5 py-2 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50 sm:text-base"
                >
                  {choice}
                </button>
              ))}
            </div>
          )}

          {/* 文字入力・年入力 */}
          {(currentStep?.type === "text" || currentStep?.type === "year") && (
            <form
              className="flex items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                saveAnswer(textInput);
              }}
            >
              <input
                type={currentStep.type === "year" ? "number" : "text"}
                inputMode={currentStep.type === "year" ? "numeric" : "text"}
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder={currentStep.placeholder}
                className="flex-1 rounded-full border border-zinc-300 px-4 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 sm:text-base"
              />
              <button
                type="submit"
                disabled={saving || textInput.trim() === ""}
                className="shrink-0 rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-zinc-300 sm:text-base"
              >
                送信
              </button>
            </form>
          )}

          {/* 完了後 */}
          {phase === "done" && (
            <div className="flex flex-col gap-2">
              <Link
                href="/inquiry"
                className="block rounded-full bg-blue-600 px-6 py-3 text-center text-sm font-semibold text-white hover:bg-blue-700 sm:text-base"
              >
                お問い合わせへ進む
              </Link>
              <Link
                href="/"
                className="block text-center text-xs text-zinc-400 underline"
              >
                トップへ戻る
              </Link>
            </div>
          )}

          {saving && (
            <p className="mt-2 text-center text-xs text-zinc-400">保存中…</p>
          )}
        </div>
      </footer>
    </div>
  );
}
