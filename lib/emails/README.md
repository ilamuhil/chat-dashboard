# Email Templates

This directory contains email templates for various transactional emails sent through Amazon SES.

## Templates

### 1. Email Verification (`email-verification.tsx`)
- **Function**: `renderEmailVerificationEmail({ verificationLink, expiresInMinutes })`
- **Purpose**: Sent when a new user signs up to verify their email address
- **Default Expiry**: 1440 minutes (24 hours)

### 2. Login OTP (`login-otp.tsx`)
- **Function**: `renderLoginOTPEmail({ otp, expiresInMinutes })`
- **Purpose**: Sent when a user requests a one-time password for login
- **Default Expiry**: 10 minutes

### 3. Verify Email OTP (`verify-otp.tsx`)
- **Function**: `renderVerifyOtpEmail({ otp, expiresInMinutes })`
- **Purpose**: Sent when a user verifies email via OTP (signup flow)
- **Default Expiry**: 10 minutes

## Usage

All templates are imported and used in `lib/email.ts`. You can use the exported functions:

```typescript
import { 
  sendEmailVerificationEmail, 
  sendLoginOTPEmail,
  sendVerifyEmailOtp
} from '@/lib/email'

// Send email verification
await sendEmailVerificationEmail(
  'user@example.com',
  'https://yourapp.com/verify-email?token=xyz789',
  1440 // expires in 24 hours
)

// Send login OTP
await sendLoginOTPEmail(
  'user@example.com',
  '123456', // 6-digit OTP
  10 // expires in 10 minutes
)

// Send verify email OTP
await sendVerifyEmailOtp(
  'user@example.com',
  '123456',
  10
)
```

## Customization

Each template uses the following environment variables for customization:
- `NEXT_PUBLIC_APP_NAME`: Your application name (defaults to "Chat Dashboard")
- `NEXT_PUBLIC_APP_URL`: Your application URL (defaults to "http://localhost:3000")

Templates return both HTML and plain text versions for better email client compatibility.
