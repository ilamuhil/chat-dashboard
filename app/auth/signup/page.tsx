import AuthForm from '@/components/auth/AuthForm'
import { signup } from '@/app/auth/actions'

export default function SignUpPage() {
  return <AuthForm mode='signup' formAction={signup} />
}