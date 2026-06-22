// ログインページ（/login）。共通の認証フォームを「login」モードで表示します。
import AuthForm from "@/components/AuthForm";

export default function LoginPage() {
  return <AuthForm mode="login" />;
}
