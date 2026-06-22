// 新規登録ページ（/register）。共通の認証フォームを「register」モードで表示します。
import AuthForm from "@/components/AuthForm";

export default function RegisterPage() {
  return <AuthForm mode="register" />;
}
