// Supabase に接続するための共通クライアント。
// アプリのどこからでも `import { supabase } from "@/lib/supabase"` で呼び出して使い回します。
//
// 接続情報（URLとキー）は、ここには直接書きません。
// プロジェクト直下の .env.local ファイルから自動で読み込みます。
//   NEXT_PUBLIC_SUPABASE_URL       … Supabase の Project URL
//   NEXT_PUBLIC_SUPABASE_ANON_KEY  … Supabase の anon public キー
// ※ NEXT_PUBLIC_ で始まる名前にすると、ブラウザ側からも読み込めるようになります。

import { createClient } from "@supabase/supabase-js";

// .env.local から値を読み込む（まだ空の場合は undefined になります）
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

// 値がちゃんと入っているか（＝鍵を貼り付け済みか）を判定するための目印。
// テスト表示で「接続準備OK／まだ未入力」を出し分けるのに使います。
export const isSupabaseConfigured =
  supabaseUrl !== "" && supabaseAnonKey !== "";

// Supabase クライアント本体。これを使ってデータベースとやり取りします。
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
