# Environment Variables for Resend

Transactional emails are delivered through [Resend](https://resend.com).

## Required

```env
RESEND_API_KEY=re_...
```

Create an API key in the Resend dashboard under **API Keys**.

## Sender configuration

During development, the application defaults to Resend's test sender:

```text
onboarding@resend.dev
```

The test sender can only deliver to the email address associated with your
Resend account. To deliver to other recipients, verify a domain in Resend and
configure:

```env
RESEND_FROM_EMAIL=noreply@example.com
RESEND_FROM_NAME=Your App Name
```

`RESEND_FROM_NAME` falls back to `NEXT_PUBLIC_APP_NAME`, then `Your workspace`.

## Testing

```typescript
import { sendLoginOTPEmail } from '@/lib/email'

await sendLoginOTPEmail('you@example.com', '1234')
```

Never commit `RESEND_API_KEY`. Configure it in the deployment platform's
server-side environment variables for production.
