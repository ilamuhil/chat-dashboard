import AuthForm from '@/components/auth/AuthForm'
import { login } from '@/app/auth/actions'

export default function LoginPage() {
  return <AuthForm mode='login' formAction={login} />
}
