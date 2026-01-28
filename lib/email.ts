import { SESClient, SendEmailCommand, SendEmailCommandInput } from '@aws-sdk/client-ses'
import { renderEmailVerificationEmail } from './emails/email-verification'
import { renderLoginOTPEmail } from './emails/login-otp'
import { renderVerifyOtpEmail } from './emails/verify-otp'

/**
 * Creates an SES client configured with AWS credentials.
 * 
 * Authentication methods (in order of priority):
 * 1. AWS Toolkit/IDE credentials (recommended for development)
 * 2. Environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
 * 3. AWS CLI credentials (~/.aws/credentials)
 * 4. IAM roles (if running on EC2/Lambda)
 * 
 * Required environment variables:
 * - AWS_REGION: AWS region (e.g., 'us-east-1', 'eu-west-1')
 * - AWS_SES_FROM_EMAIL: Verified sender email address in SES
 * 
 * Optional environment variables (only needed if not using AWS Toolkit/IDE):
 * - AWS_ACCESS_KEY_ID: AWS access key ID
 * - AWS_SECRET_ACCESS_KEY: AWS secret access key
 * - AWS_SES_FROM_NAME: Display name for sender (optional, defaults to app name)
 */
function createSESClient(): SESClient {
  const region = process.env.AWS_REGION

  if (!region) {
    throw new Error('AWS_REGION environment variable is required')
  }

  // If access keys are provided via environment variables, use them
  // Otherwise, AWS SDK will use default credential provider chain:
  // 1. Environment variables
  // 2. AWS credentials file (~/.aws/credentials)
  // 3. AWS Toolkit/IDE credentials (if using VS Code, IntelliJ, etc.)
  // 4. IAM roles (if running on EC2/Lambda)
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY

  const clientConfig: {
    region: string
    credentials?: {
      accessKeyId: string
      secretAccessKey: string
    }
  } = {
    region,
  }

  // Only set credentials explicitly if provided via environment variables
  // Otherwise, let AWS SDK use the default credential provider chain
  if (accessKeyId && secretAccessKey) {
    clientConfig.credentials = {
      accessKeyId,
      secretAccessKey,
    }
  }
  // If not provided, AWS SDK will automatically use:
  // - AWS Toolkit credentials (if IDE is configured)
  // - AWS CLI credentials (~/.aws/credentials)
  // - IAM roles (if on EC2/Lambda)

  return new SESClient(clientConfig)
}

/**
 * Gets the default sender email and name from environment variables.
 */
function getDefaultSender(): { email: string; name: string } {
  const fromEmail = process.env.AWS_SES_FROM_EMAIL
  const fromName = process.env.AWS_SES_FROM_NAME || process.env.NEXT_PUBLIC_APP_NAME || 'Chat Dashboard'
  console.log('fromEmail', fromEmail)
  console.log('fromName', fromName)
  if (!fromEmail) {
    throw new Error('AWS_SES_FROM_EMAIL environment variable is required')
  }

  return { email: fromEmail, name: fromName }
}

/**
 * Sends an email using Amazon SES.
 */
async function sendEmail(params: {
  to: string | string[]
  subject: string
  htmlBody: string
  textBody?: string
  from?: { email: string; name: string }
  replyTo?: string | string[]
}): Promise<{ messageId: string }> {
  const client = createSESClient()
  const defaultSender = getDefaultSender()
  const { to, subject, htmlBody, textBody, from = defaultSender, replyTo } = params

  // Convert single recipient to array
  const toAddresses = Array.isArray(to) ? to : [to]
  const replyToAddresses = replyTo ? (Array.isArray(replyTo) ? replyTo : [replyTo]) : undefined

  const commandInput: SendEmailCommandInput = {
    Source: `${from.name} <${from.email}>`,
    Destination: {
      ToAddresses: toAddresses,
    },
    Message: {
      Subject: {
        Data: subject,
        Charset: 'UTF-8',
      },
      Body: {
        Html: {
          Data: htmlBody,
          Charset: 'UTF-8',
        },
        ...(textBody && {
          Text: {
            Data: textBody,
            Charset: 'UTF-8',
          },
        }),
      },
    },
    ...(replyToAddresses && {
      ReplyToAddresses: replyToAddresses,
    }),
  }

  try {
    const command = new SendEmailCommand(commandInput)
    const response = await client.send(command)
    
    if (!response.MessageId) {
      throw new Error('No message ID returned from SES')
    }

    return { messageId: response.MessageId }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to send email: ${errorMessage}`)
  }
}

/**
 * Sends a password reset email.
 * 
 * @param to - Recipient email address
 * @param resetLink - Password reset link with token
 * @param expiresInMinutes - Expiration time in minutes (for display purposes)
 */
/**
 * Sends an email verification email.
 * 
 * @param to - Recipient email address
 * @param verificationLink - Email verification link with token
 * @param expiresInMinutes - Expiration time in minutes (for display purposes)
 */
export async function sendEmailVerificationEmail(
  to: string,
  verificationLink: string,
  expiresInMinutes: number = 1440 // 24 hours
): Promise<{ messageId: string }> {
  const { html, text } = renderEmailVerificationEmail({
    verificationLink,
    expiresInMinutes,
  })

  return sendEmail({
    to,
    subject: 'Verify Your Email Address',
    htmlBody: html,
    textBody: text,
  })
}

/**
 * Sends a login OTP email.
 * 
 * @param to - Recipient email address
 * @param otp - One-time password code
 * @param expiresInMinutes - Expiration time in minutes (for display purposes)
 */
export async function sendLoginOTPEmail(
  to: string,
  otp: string,
  expiresInMinutes: number = 10
): Promise<{ messageId: string }> {
  const { html, text } = renderLoginOTPEmail({
    otp,
    expiresInMinutes,
  })

  return sendEmail({
    to,
    subject: 'Your Login Code',
    htmlBody: html,
    textBody: text,
  })
}

/**
 * Sends an email OTP used for verifying an email (e.g. signup flow).
 */
export async function sendVerifyEmailOtp(
  to: string,
  otp: string,
  expiresInMinutes: number = 10
): Promise<{ messageId: string }> {
  const { html, text } = renderVerifyOtpEmail({ otp, expiresInMinutes })
  return sendEmail({
    to,
    subject: 'Verify your email',
    htmlBody: html,
    textBody: text,
  })
}

/**
 * Sends a password reset OTP email.
 */
/**
 * Generic function to send custom emails.
 * Use this for emails that don't fit the predefined templates.
 * 
 * @param params - Email parameters
 */
export async function sendCustomEmail(params: {
  to: string | string[]
  subject: string
  htmlBody: string
  textBody?: string
  from?: { email: string; name: string }
  replyTo?: string | string[]
}): Promise<{ messageId: string }> {
  return sendEmail(params)
}
