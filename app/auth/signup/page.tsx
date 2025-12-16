import AuthForm from '@/components/auth/AuthForm'
import { signup } from '@/app/actions/auth'

export default function SignUpPage() {
  return <AuthForm mode='signup' formAction={signup} />
}