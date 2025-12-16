import AuthForm from '@/components/auth/AuthForm'
import { login } from '@/app/actions/auth'

export default function LoginPage() {
  return <AuthForm mode='login' formAction={login} />
}
