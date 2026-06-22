-- ============================================================
-- 山田工務店 会員ページ ─ お問い合わせ（質問・クレーム）テーブル inquiries
-- レッスン5：このSQLを Supabase の SQL Editor に貼り付けて実行します。
-- ============================================================

-- 1) お問い合わせテーブル本体 -----------------------------------
create table public.inquiries (
  -- id：自動採番の主キー
  id          bigint generated always as identity primary key,

  -- email：誰が送ったか。会員のメールアドレスとひもづけます。
  email       text not null,

  -- body：送られた内容（質問・クレーム本文）
  body        text not null,

  -- category：自動分類の結果。
  --   見積依頼 / 予約・相談 / クレーム / その他 の4種類のいずれか。
  category    text not null
              check (category in ('見積依頼', '予約・相談', 'クレーム', 'その他')),

  -- created_at：送信日時（自動）
  created_at  timestamptz not null default now()
);

comment on table  public.inquiries is '会員からのお問い合わせ（自動分類つき）';
comment on column public.inquiries.email is '送信した会員のメールアドレス';
comment on column public.inquiries.category is '自動分類：見積依頼/予約・相談/クレーム/その他';


-- 2) RLS（行レベルセキュリティ）を有効にする ---------------------
alter table public.inquiries enable row level security;


-- 3) ポリシー：「自分の送信内容しか触れない」 -------------------
-- ログイン中の本人のメールアドレスと、その行の email が一致する場合だけ許可します。

-- (a) 閲覧：自分が送ったものだけ SELECT できる
create policy "会員は自分の問い合わせだけ閲覧できる"
  on public.inquiries
  for select
  to authenticated
  using ( (auth.jwt() ->> 'email') = email );

-- (b) 送信：自分のメールアドレスでだけ INSERT できる
create policy "会員は自分の問い合わせだけ送信できる"
  on public.inquiries
  for insert
  to authenticated
  with check ( (auth.jwt() ->> 'email') = email );

-- ※ UPDATE / DELETE のポリシーは作っていません（＝送信後の書き換え・削除は不可）。
--   問い合わせ記録を会員側が改ざんできないようにするためです。
