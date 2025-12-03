'use client'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { UseFormReturn } from 'react-hook-form'
import Link from 'next/link'
import ConfirmationDialog from '@/components/auth/ConfirmationDialog'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import supabase from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

type Props = {
  mode: 'login' | 'signup'
  authflow: () => Promise<void>
  form: UseFormReturn<{ email: string; password: string }>
  verifyEmail?: boolean
  error?: string
}

const AuthForm = (props: Props) => {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const { form, authflow, verifyEmail, error } = props
  const [loading, setLoading] = useState(false)
  const resetPassword = async() => {
    const email = form.getValues('email')
    if (!email) {
      return
    }
    //TODO connect to supabase auth to send reset password email
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`
    })
    if (error) {
      console.error(error)
    }
    if (data) {
      console.log(data)
    }
    setOpen(false)
  }

  const getSession = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (session) {
      router.push('/dashboard')
    }
  }

  useEffect(() => {
    getSession()
  }, [])

  const watchedEmail = form.watch('email')
  const formSubmit = async () => {
    setLoading(true)
    await authflow()
    setLoading(false)
  }

  return (
    <>
      <ConfirmationDialog
        title='Are you sure you want to reset your password?'
        description={
          watchedEmail
            ? 'An email will be sent with a password reset link.'
            : 'Please enter your email in the login form to reset your password.'
        }
        open={open}
        setOpen={setOpen}
        onConfirm={resetPassword}
      />
      <form
        onSubmit={form.handleSubmit(formSubmit)}
        className='flex justify-center items-center h-dvh'>
        <Card className='w-full max-w-sm'>
          <CardHeader>
            <CardTitle className={cn('text-2xl font-bold')}>
              {props.mode === 'login' ? 'Login' : 'Create an account'}
            </CardTitle>
            <CardDescription>
              {props.mode === 'login'
                ? 'Enter your email below to login to your account'
                : 'Enter your email below to create an account'}
            </CardDescription>
            <CardAction>
              <Link
                href={props.mode === 'login' ? '/auth/signup' : '/auth/login'}>
                {props.mode === 'login' ? 'Sign Up' : 'Login'}
              </Link>
            </CardAction>
          </CardHeader>
          <CardContent>
            <div>
              <div className='flex flex-col gap-6'>
                <div
                  className={cn(
                    verifyEmail && 'alert-success',
                    error && 'alert-danger',
                    !verifyEmail &&
                      !error &&
                      '-translate-y-full opacity-0 h-0 pointer-events-none'
                  )}>
                  {verifyEmail && 'Please verify your email to continue.'}
                  {error && error}
                </div>
                <div className='grid gap-2'>
                  <Label htmlFor='email'>Email</Label>
                  <Input
                    id='email'
                    type='email'
                    placeholder='m@example.com'
                    required
                    {...form.register('email')}
                  />
                  {form.formState.errors.email && (
                    <small className='text-sm text-destructive'>
                      {form.formState.errors.email.message}
                    </small>
                  )}
                </div>
                <div className='grid gap-2'>
                  <div className='flex items-center'>
                    <Label htmlFor='password'>Password</Label>
                    {props.mode === 'login' && (
                      <Button
                        size='sm'
                        variant='link'
                        onClick={() => setOpen(true)}
                        className='ml-auto inline-block text-sm underline-offset-4 hover:underline'>
                        Forgot your password?
                      </Button>
                    )}
                  </div>
                  <Input
                    id='password'
                    type='password'
                    required
                    {...form.register('password')}
                  />
                  {form.formState.errors.password && (
                    <small className='text-sm text-destructive'>
                      {form.formState.errors.password.message}
                    </small>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className='flex-col gap-2'>
            <Button type='submit' className='w-full'>
              {props.mode === 'login' ? 'Login' : 'Sign up'}
              {loading && <Spinner />}
            </Button>
            <Button
              disabled={loading}
              type='button'
              variant='outline'
              className='w-full'>
              {props.mode === 'login'
                ? 'Login with Google'
                : 'Sign up with Google'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </>
  )
}

export default AuthForm
