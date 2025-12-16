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
import Link from 'next/link'
import ConfirmationDialog from '@/components/auth/ConfirmationDialog'
import { useState, useActionState } from 'react'
import { cn } from '@/lib/utils'
import supabase from '@/lib/supabase-client'

type AuthResult = {
  error?: string | Record<string, string[]>
  success?: string
}

type Props = {
  mode: 'login' | 'signup'
  formAction: (
    prevState: AuthResult | null,
    formData: FormData
  ) => Promise<AuthResult>
}

const AuthForm = (props: Props) => {
  const [open, setOpen] = useState(false)
  const { formAction, mode } = props
  
  const [state, action, isPending] = useActionState<AuthResult, FormData>(
    formAction,
    null
  )


  const resetPassword = async () => {
    const emailInput = document.getElementById('email') as HTMLInputElement
    const email = emailInput?.value
    if (!email) {
      return
    }
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

  const errorMessage = 
    typeof state?.error === 'string' 
      ? state.error 
      : state?.error 
        ? Object.values(state.error).flat()[0] 
        : null

  const successMessage = state?.success


  return (
    <>
      <ConfirmationDialog
        title='Are you sure you want to reset your password?'
        description='An email will be sent with a password reset link.'
        open={open}
        setOpen={setOpen}
        onConfirm={resetPassword}
      />
      <form
        action={action}
        className='flex justify-center items-center h-dvh'>
        <Card className='w-full max-w-sm'>
          <CardHeader>
            <CardTitle className={cn('text-2xl font-bold')}>
              {mode === 'login' ? 'Login' : 'Create an account'}
            </CardTitle>
            <CardDescription>
              {mode === 'login'
                ? 'Enter your email below to login to your account'
                : 'Enter your email below to create an account'}
            </CardDescription>
            <CardAction>
              <Link
                href={mode === 'login' ? '/auth/signup' : '/auth/login'}>
                {mode === 'login' ? 'Sign Up' : 'Login'}
              </Link>
            </CardAction>
          </CardHeader>
          <CardContent>
            <div>
              <div className='flex flex-col gap-6'>
                <div
                  className={cn(
                    successMessage && 'alert-success',
                    errorMessage && 'alert-danger',
                    !successMessage &&
                      !errorMessage &&
                      '-translate-y-full opacity-0 h-0 pointer-events-none'
                  )}>
                  {successMessage && successMessage}
                  {errorMessage && errorMessage}
                </div>
                {mode === 'signup' && (
                  <>
                    <div className='grid gap-2'>
                      <Label htmlFor='fullname'>Full Name</Label>
                      <Input
                        id='fullname'
                        name='fullname'
                        type='text'
                        placeholder='Akash Kumar'
                        required
                      />
                      {typeof state?.error === 'object' && state.error?.fullname && (
                        <small className='text-sm text-destructive'>
                          {state.error.fullname[0]}
                        </small>
                      )}
                    </div>
                    <div className='grid gap-2'>
                      <Label htmlFor='phone'>Phone Number</Label>
                      <Input
                        id='phone'
                        name='phone'
                        type='tel'
                        placeholder='+91 9876543210'
                      />
                      {typeof state?.error === 'object' && state.error?.phone && (
                        <small className='text-sm text-destructive'>
                          {state.error.phone[0]}
                        </small>
                      )}
                    </div>
                  </>
                )}
                <div className='grid gap-2'>
                  <Label htmlFor='email'>Email</Label>
                  <Input
                    id='email'
                    name='email'
                    type='email'
                    placeholder='m@example.com'
                    required
                  />
                  {typeof state?.error === 'object' && state.error?.email && (
                    <small className='text-sm text-destructive'>
                      {state.error.email[0]}
                    </small>
                  )}
                </div>
                <div className='grid gap-2'>
                  <div className='flex items-center'>
                    <Label htmlFor='password'>Password</Label>
                    {mode === 'login' && (
                      <Button
                        type='button'
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
                    name='password'
                    type='password'
                    required
                  />
                  {typeof state?.error === 'object' && state.error?.password && (
                    <small className='text-sm text-destructive'>
                      {state.error.password[0]}
                    </small>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className='flex-col gap-2'>
            <Button type='submit' disabled={isPending} className='w-full'>
              {mode === 'login' ? 'Login' : 'Sign up'}
              {isPending && <Spinner />}
            </Button>
            <Button
              disabled={isPending}
              type='button'
              variant='outline'
              className='w-full'>
              {mode === 'login'
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
