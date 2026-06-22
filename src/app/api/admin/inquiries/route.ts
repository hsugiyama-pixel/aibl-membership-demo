// 管理画面用のサーバーAPI（/api/admin/inquiries）。
//
// このファイルは「サーバー側」だけで実行されます。ブラウザには中身が出ません。
// なので、合言葉（ADMIN_PASSCODE）と管理者専用キー（service_role）を安全に使えます。
//
// やること：
//   ① ブラウザから送られてきた合言葉が、正しいか確認する
//   ② 正しければ service_role キーで全件（問い合わせ＋各会員の国・地域）を読んで返す
//      ※ service_role は RLS を飛び越えて全件読める強力なキーなので、サーバー限定で使います。

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  // ブラウザから送られた合言葉を受け取る
  const { passcode } = await request.json().catch(() => ({ passcode: "" }));

  const adminPasscode = process.env.ADMIN_PASSCODE;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // 設定が足りない場合（.env.local が空など）
  if (!adminPasscode || !supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { error: "管理画面の設定（.env.local の ADMIN_PASSCODE / SUPABASE_SERVICE_ROLE_KEY）が未入力です。" },
      { status: 500 },
    );
  }

  // service_role キーの取り違え検知。
  //   公開キー（sb_publishable_... / anon と同じ値）が入っていると、
  //   RLS が効いて全件が0件になってしまうため、ここではっきり知らせる。
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (serviceKey.startsWith("sb_publishable_") || serviceKey === anonKey) {
    return NextResponse.json(
      {
        error:
          "SUPABASE_SERVICE_ROLE_KEY に公開キー(anon)が設定されています。" +
          "Supabase → Settings → API → service_role（secret／sb_secret_… で始まる方）のキーに差し替えてください。",
      },
      { status: 500 },
    );
  }

  // ① 合言葉の照合
  if (passcode !== adminPasscode) {
    return NextResponse.json({ error: "合言葉が違います。" }, { status: 401 });
  }

  // ② service_role キーで全件を読む（サーバー側だけ）
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  // 会員（国・地域を引くため）と、問い合わせ全件を取得
  const [membersRes, inquiriesRes] = await Promise.all([
    admin.from("members").select("email, country, region"),
    admin
      .from("inquiries")
      .select("id, email, body, category, created_at")
      .order("created_at", { ascending: false }),
  ]);

  if (membersRes.error || inquiriesRes.error) {
    return NextResponse.json(
      { error: "データの取得に失敗しました。" },
      { status: 500 },
    );
  }

  // メールアドレス → 国・地域 の対応表を作る
  const memberMap = new Map<string, { country: string | null; region: string | null }>();
  for (const m of membersRes.data ?? []) {
    memberMap.set(m.email, { country: m.country, region: m.region });
  }

  // 各問い合わせに、その人の国・地域をくっつけて返す
  const rows = (inquiriesRes.data ?? []).map((q) => {
    const info = memberMap.get(q.email);
    return {
      id: q.id,
      email: q.email,
      body: q.body,
      category: q.category,
      created_at: q.created_at,
      country: info?.country ?? null,
      region: info?.region ?? null,
    };
  });

  return NextResponse.json({ rows });
}
