'use client'

import Link from 'next/link'
import { useRef, useState, type FormEvent } from 'react'
import { ArrowUpRight, CheckCircle2, LoaderCircle } from 'lucide-react'

export function ContactForm({ email }: { email: string }) {
  const [status, setStatus] = useState<
    'idle' | 'sending' | 'success' | 'error'
  >('idle')
  const [error, setError] = useState('')
  const successHeading = useRef<HTMLHeadingElement | null>(null)
  const errorMessage = useRef<HTMLDivElement | null>(null)
  const submitting = useRef(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting.current) return
    submitting.current = true
    const form = event.currentTarget
    const values = new FormData(form)
    setError('')
    setStatus('sending')
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: values.get('name'),
          email: values.get('email'),
          institution: values.get('institution'),
          websiteUrl: values.get('websiteUrl'),
          interest: values.get('interest'),
          message: values.get('message'),
          consent: values.get('consent') === 'on',
          website: values.get('website'),
        }),
      })
      const result = await response.json()
      if (!response.ok || result.ok !== true)
        throw new Error(
          result.error || 'We couldn’t send your enquiry. Please try again.',
        )
      setStatus('success')
      form.reset()
      requestAnimationFrame(() => successHeading.current?.focus())
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'We couldn’t send your enquiry. Please try again.',
      )
      setStatus('error')
      requestAnimationFrame(() => errorMessage.current?.focus())
    } finally {
      submitting.current = false
    }
  }

  if (status === 'success')
    return (
      <div className='contact-success' role='status'>
        <CheckCircle2 size={39} aria-hidden='true' />
        <h3 ref={successHeading} tabIndex={-1}>
          Your enquiry is on its way.
        </h3>
        <p>
          Thanks for telling us about your institute. We’ll reply to the email
          address you provided.
        </p>
        <button
          type='button'
          className='marketing-button secondary'
          onClick={() => setStatus('idle')}
        >
          Send another enquiry
        </button>
      </div>
    )

  return (
    <form
      className='contact-form'
      onSubmit={submit}
      aria-busy={status === 'sending'}
    >
      <fieldset disabled={status === 'sending'}>
        <legend className='sr-only'>Your contact details and enquiry</legend>
        <div className='contact-form-grid'>
          <div className='contact-field'>
            <label htmlFor='contact-name'>Your name *</label>
            <input
              id='contact-name'
              name='name'
              autoComplete='name'
              placeholder='Your full name'
              minLength={2}
              maxLength={100}
              required
            />
          </div>
          <div className='contact-field'>
            <label htmlFor='contact-email'>Email address *</label>
            <input
              id='contact-email'
              name='email'
              type='email'
              autoComplete='email'
              placeholder='you@institute.edu'
              maxLength={254}
              required
            />
          </div>
        </div>
        <div className='contact-field'>
          <label htmlFor='contact-institution'>
            Institute or organization *
          </label>
          <input
            id='contact-institution'
            name='institution'
            autoComplete='organization'
            placeholder='The name of your institute'
            minLength={2}
            maxLength={160}
            required
          />
        </div>
        <div className='contact-field'>
          <label htmlFor='contact-url'>
            Website <span>(optional)</span>
          </label>
          <input
            id='contact-url'
            name='websiteUrl'
            type='url'
            autoComplete='url'
            placeholder='https://your-institute.edu'
            maxLength={500}
          />
        </div>
        <div className='contact-field'>
          <label htmlFor='contact-interest'>
            What would you like to discuss? *
          </label>
          <select
            id='contact-interest'
            name='interest'
            defaultValue=''
            required
          >
            <option value='' disabled>
              Select a topic
            </option>
            <option value='product'>Product fit & walkthrough</option>
            <option value='setup'>Setup & website installation</option>
            <option value='pricing'>Plans & pricing</option>
            <option value='support'>Help with an existing account</option>
            <option value='other'>Something else</option>
          </select>
        </div>
        <div className='contact-field'>
          <label htmlFor='contact-message'>How can we help? *</label>
          <textarea
            id='contact-message'
            name='message'
            rows={4}
            placeholder='Tell us about your admissions workflow, your questions, or what you’re hoping to improve.'
            minLength={20}
            maxLength={4000}
            required
          />
        </div>
        <div hidden aria-hidden='true'>
          <label htmlFor='contact-website'>Leave this field empty</label>
          <input
            id='contact-website'
            name='website'
            tabIndex={-1}
            autoComplete='off'
          />
        </div>
        <div className='contact-consent'>
          <input id='contact-consent' name='consent' type='checkbox' required />
          <label htmlFor='contact-consent'>
            I agree to be contacted about this enquiry and have read the{' '}
            <Link href='/privacy'>Privacy Policy</Link>. Please don’t include
            student records or sensitive personal information.
          </label>
        </div>
      </fieldset>
      {status === 'error' ? (
        <div
          className='contact-error'
          role='alert'
          ref={errorMessage}
          tabIndex={-1}
        >
          {error} You can also email{' '}
          <a href={`mailto:${email}`} className='underline'>
            {email}
          </a>
          .
        </div>
      ) : null}
      <button
        type='submit'
        className='marketing-button primary'
        disabled={status === 'sending'}
      >
        {status === 'sending' ? (
          <>
            Sending your enquiry{' '}
            <LoaderCircle
              size={17}
              className='animate-spin motion-reduce:animate-none'
              aria-hidden='true'
            />
          </>
        ) : (
          <>
            Send your enquiry <ArrowUpRight size={18} aria-hidden='true' />
          </>
        )}
      </button>
      <p className='contact-form-note'>
        We use these details to respond to your enquiry. No automatic newsletter
        signup.
      </p>
    </form>
  )
}
