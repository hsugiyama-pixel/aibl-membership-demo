-- ============================================================
-- 山田工務店 会員ページ ─ 会員名簿テーブル members を作成する
-- レッスン1：このSQLを Supabase の SQL Editor に貼り付けて実行します。
-- ============================================================

-- 1) 会員名簿テーブル本体 ---------------------------------------
create table public.members (
  -- id：自動で1,2,3…と振られる主キー（こちらが番号を指定しなくてよい）
  id          bigint generated always as identity primary key,

  -- email：メールアドレス。
  --   not null = 必須、 unique = 重複禁止（同じメールで2回登録できない）
  email       text not null unique,

  -- 登録フローで1問ずつ埋めていく項目（最初は空＝null でもよい）
  language    text,                 -- 言語
  country     text,                 -- 国
  region      text,                 -- 地域（県／州）
  gender      text,                 -- 性別
  birth_year  integer,              -- 生まれた年

  -- status：登録の状態。初期値は「登録途中（in_progress）」。
  --   登録が全部終わったらアプリ側で「完了（completed）」に変えます。
  --   check で、この2つ以外の値が入らないようにしておきます。
  status      text not null default 'in_progress'
              check (status in ('in_progress', 'completed')),

  -- created_at：登録日時。何も指定しなければ「今の日時」が自動で入る。
  created_at  timestamptz not null default now()
);

-- メモを残しておくと、Supabaseの画面で各列の意味が見やすくなります。
comment on table  public.members is '山田工務店の会員名簿';
comment on column public.members.email is 'メールアドレス（重複禁止・本人確認に使用）';
comment on column public.members.status is '登録状態：in_progress=登録途中 / completed=完了';


-- 2) RLS（行レベルセキュリティ）を有効にする ---------------------
-- これを有効にすると、ポリシーで許可した行だけしか読み書きできなくなります。
-- （＝デフォルトでは「誰も見られない」状態になり、安全側に倒れます）
alter table public.members enable row level security;


-- 3) ポリシー：「自分のデータしか触れない」 ----------------------
-- 仕組み：ログイン中の本人のメールアドレス（ログイン情報の中に入っています）と、
--         その行の email 列が一致する場合だけ許可します。
--   auth.jwt() ->> 'email'  …… 今ログインしている人のメールアドレス
--   email                   …… その行（その会員）のメールアドレス
-- → 他人の行は email が一致しないので、見ることも書き換えることもできません。

-- (a) 閲覧：自分の行だけ SELECT できる
create policy "会員は自分のデータだけ閲覧できる"
  on public.members
  for select
  to authenticated
  using ( (auth.jwt() ->> 'email') = email );

-- (b) 登録：自分のメールアドレスの行だけ INSERT できる
create policy "会員は自分のデータだけ登録できる"
  on public.members
  for insert
  to authenticated
  with check ( (auth.jwt() ->> 'email') = email );

-- (c) 更新：自分の行だけ UPDATE できる（登録フローで1項目ずつ保存するため）
create policy "会員は自分のデータだけ更新できる"
  on public.members
  for update
  to authenticated
  using ( (auth.jwt() ->> 'email') = email )
  with check ( (auth.jwt() ->> 'email') = email );

-- ※ DELETE（削除）のポリシーはあえて作っていません。
--   ポリシーが無い操作は「禁止」になるため、会員が自分のデータを誤って消すことはできません。
