# Environment Variables for Amazon SES Email Service

This document lists all required and optional environment variables for the email service.

## 🧪 Testing Without a Domain (Sandbox Mode)

**Good news!** You can test email functionality without owning a domain using AWS SES Sandbox Mode. Here's how:

### Quick Setup for Testing:

1. **Verify Your Personal Email as Sender:**
   - Go to [AWS SES Console](https://console.aws.amazon.com/ses/) → **Verified identities**
   - Click **"Create identity"**
   - Select **"Email address"** (not domain)
   - Enter your personal email (e.g., `yourname@gmail.com`, `yourname@outlook.com`)
   - Check your email inbox and click the verification link
   - Wait for status to show "Verified"

2. **Verify Recipient Emails (for testing):**
   - In sandbox mode, you can **only send to verified email addresses**
   - Repeat the verification process for any email addresses you want to test with
   - For example, verify `test@gmail.com` if you want to send test emails there

3. **Set Environment Variables:**
   
   **Option A: Using AWS Toolkit (Recommended):**
   ```env
   AWS_REGION=us-east-1
   AWS_SES_FROM_EMAIL=yourname@gmail.com  # Your verified email
   AWS_SES_FROM_NAME=Chat Dashboard
   ```
   Then authenticate using AWS Toolkit in your IDE (see setup below).
   
   **Option B: Using Access Keys:**
   ```env
   AWS_REGION=us-east-1
   AWS_ACCESS_KEY_ID=your_access_key_id
   AWS_SECRET_ACCESS_KEY=your_secret_access_key
   AWS_SES_FROM_EMAIL=yourname@gmail.com  # Your verified email
   AWS_SES_FROM_NAME=Chat Dashboard
   ```

4. **Test Your Setup:**
   ```typescript
   import { sendLoginOTPEmail } from '@/lib/email'
   
   // Make sure recipient email is also verified in SES!
   await sendLoginOTPEmail(
     'test@gmail.com',  // Must be verified in SES
     '123456'
   )
   ```

### Sandbox Mode Limitations:
- ✅ **Can send from verified email addresses** (no domain needed)
- ✅ **Perfect for development and testing**
- ❌ **Can only send TO verified email addresses**
- ❌ **Limited to 200 emails per day**
- ❌ **1 email per second sending rate**

### Moving to Production:
When you're ready to send to any email address:
- Go to SES Console → **Account dashboard**
- Click **"Request production access"**
- Fill out the form (explain your use case)
- AWS typically approves within 24-48 hours
- Once approved, you can send to any email address

**For now, sandbox mode is perfect for testing!** Just verify your personal email and any test recipient emails.

---

## Required Environment Variables

### AWS Configuration

#### Option 1: Using AWS Toolkit/IDE (Recommended for Development) ⭐

**This is the recommended approach!** Use your IDE's AWS Toolkit to authenticate:

```env
# AWS Region where your SES is configured
# Examples: 'us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1'
AWS_REGION=us-east-1

# Verified sender email address in SES
AWS_SES_FROM_EMAIL=yourname@gmail.com
```

**No access keys needed!** The AWS SDK will automatically use credentials from:
- AWS Toolkit in your IDE (VS Code, IntelliJ, etc.)
- AWS CLI credentials (`~/.aws/credentials`)
- IAM roles (if running on EC2/Lambda)

#### Option 2: Using Environment Variables (Alternative)

If you prefer to use access keys directly:

```env
# AWS Region where your SES is configured
AWS_REGION=us-east-1

# AWS Access Key ID with SES permissions
AWS_ACCESS_KEY_ID=your_access_key_id_here

# AWS Secret Access Key
AWS_SECRET_ACCESS_KEY=your_secret_access_key_here

# Verified sender email address in SES
# For testing: Use your personal email (e.g., yourname@gmail.com)
# For production: Use an email from your verified domain (e.g., noreply@yourdomain.com)
AWS_SES_FROM_EMAIL=yourname@gmail.com
```

## Optional Environment Variables

### Email Configuration
```env
# Display name for email sender (defaults to app name or "Chat Dashboard")
AWS_SES_FROM_NAME=Your App Name

# Application name used in email templates (defaults to "Chat Dashboard")
NEXT_PUBLIC_APP_NAME=Chat Dashboard

# Application URL used in email templates (defaults to "http://localhost:3000")
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

## AWS SES Setup Instructions

### 1. Verify Your Email Address or Domain

**For Testing/Development (Sandbox Mode - No Domain Required):**
- Go to AWS SES Console → Verified identities
- Click "Create identity"
- Choose **"Email address"** (not domain)
- Enter your personal email (Gmail, Outlook, etc. all work)
- Check your inbox and click the verification link
- ✅ **You can now send emails from this address!**
- ⚠️ **Note:** In sandbox mode, recipient emails must also be verified

**For Production (With Domain):**
- Verify your entire domain in SES
- This allows sending from any email address on that domain
- Requires adding DNS records (SPF, DKIM) to your domain
- Once domain is verified, you can send from any email on that domain

### Domain Verification Form Fields Explained

If you have a domain and want to verify it, here's what to enter in the SES form:

#### 1. **Sending Domain** (Required)
- **What to enter:** Your domain name without `http://` or `www`
- **Examples:**
  - ✅ `example.com`
  - ✅ `mydomain.org`
  - ✅ `mycompany.io`
  - ❌ `www.example.com` (don't include www)
  - ❌ `https://example.com` (don't include protocol)
- **Requirements:**
  - Must be a valid domain you own
  - Up to 253 alphanumeric characters
  - You need access to DNS settings to add verification records

#### 2. **MAIL FROM Domain** (Optional but Recommended)
- **What to enter:** A subdomain of your verified domain
- **Examples:**
  - If your domain is `example.com`, use: `mail.example.com` or `ses.example.com`
  - If your domain is `mydomain.org`, use: `mail.mydomain.org`
- **Why use it:**
  - Better email deliverability
  - DMARC compliance (domain alignment)
  - Better reputation management
  - Professional branding
- **Requirements:**
  - Must be a subdomain of your verified sending domain
  - You'll need to add MX records to your DNS

#### 3. **Behavior on MX Failure** (Required if using MAIL FROM domain)
Choose what happens if MAIL FROM domain MX records aren't set up correctly:

- **"Use default MAIL FROM domain"** (Recommended for beginners)
  - Falls back to Amazon's default (e.g., `bounce.amazonses.com`)
  - Emails still send even if your custom MAIL FROM isn't configured
  - Good for testing or if you're not ready to set up MX records

- **"Reject message"**
  - Stops sending if MAIL FROM domain MX records are missing/incorrect
  - More strict, ensures proper configuration
  - Use this once you've properly configured your MX records

### Quick Setup Guide for Domain Verification

1. **Enter your domain:**
   ```
   example.com
   ```

2. **Optional - Enter MAIL FROM subdomain:**
   ```
   mail.example.com
   ```
   (Leave blank if you don't want to set this up yet)

3. **Choose MX failure behavior:**
   - Start with "Use default MAIL FROM domain" for easier setup
   - Change to "Reject message" later once everything is configured

4. **Add DNS records:**
   - SES will show you the DNS records to add
   - Add them to your domain's DNS settings
   - Wait for verification (usually 24-48 hours, can be faster)

### Still Testing? Skip Domain Setup!

**Remember:** If you're just testing, you don't need a domain at all! Just:
1. Click "Create identity" → Choose "Email address" (not domain)
2. Enter your personal email
3. Verify it
4. Start sending test emails

You can always add a domain later when you're ready for production.

### 2. Request Production Access (if needed)

If you're in SES sandbox mode:
- You can only send to verified email addresses
- Request production access from AWS SES Console → Account dashboard
- This allows sending to any email address

### 3. Set Up Authentication

You have two options for authentication:

#### Option A: AWS Toolkit/IDE (Recommended) ⭐

**This is the recommended approach!** It's more secure and easier to manage.

**For VS Code:**
1. Install the [AWS Toolkit extension](https://marketplace.visualstudio.com/items?itemName=AmazonWebServices.aws-toolkit-vscode)
2. Open Command Palette (Ctrl+Shift+P / Cmd+Shift+P)
3. Run: `AWS: Connect to AWS`
4. Choose your authentication method:
   - **AWS IAM Identity Center (SSO)** - If your organization uses SSO
   - **AWS Explorer: Add Connection** - For direct AWS account access
5. Follow the prompts to authenticate
6. Your credentials will be automatically used by the AWS SDK

**For IntelliJ/WebStorm:**
1. Install the AWS Toolkit plugin
2. Go to Settings → AWS Toolkit
3. Configure your AWS credentials or IAM Identity Center
4. Connect to your AWS account

**For other IDEs:**
- Check if your IDE has an AWS Toolkit plugin
- Or use AWS CLI credentials (see below)

**Benefits:**
- ✅ No need to manage access keys
- ✅ Automatic credential refresh
- ✅ More secure (credentials stored securely)
- ✅ Works with IAM Identity Center (SSO)

#### Option B: Access Keys (Alternative)

If you prefer to use access keys directly:

1. Go to AWS IAM Console → Users → Create user
2. Attach the policy `AmazonSESFullAccess` or create a custom policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ses:SendEmail",
        "ses:SendRawEmail"
      ],
      "Resource": "*"
    }
  ]
}
```

3. Create access keys for this user
4. Add them to your environment variables (see Option 2 above)

**Or use AWS CLI credentials:**
1. Install [AWS CLI](https://aws.amazon.com/cli/)
2. Run: `aws configure`
3. Enter your access key ID and secret access key
4. The SDK will automatically use these credentials from `~/.aws/credentials`

### 4. Configure Environment Variables

Add all required variables to your `.env.local` file (for development) or your deployment platform's environment variables (for production).

## Testing

You can test the email service by importing and calling the functions:

```typescript
import { sendLoginOTPEmail } from '@/lib/email'

try {
  const result = await sendLoginOTPEmail(
    'test@example.com',
    '123456'
  )
  console.log('Email sent:', result.messageId)
} catch (error) {
  console.error('Failed to send email:', error)
}
```

## Troubleshooting

### Common Issues

1. **"Email address not verified"**
   - Make sure `AWS_SES_FROM_EMAIL` is verified in SES
   - In sandbox mode, recipient email must also be verified

2. **"Access Denied"**
   - If using AWS Toolkit: Check that you're connected to the correct AWS account
   - If using access keys: Verify access keys are correct
   - Check IAM user/role has SES permissions (`ses:SendEmail`, `ses:SendRawEmail`)
   - Verify you're using the correct AWS region

3. **"Region mismatch"**
   - Ensure `AWS_REGION` matches the region where SES is configured
   - Some regions may not support SES - check AWS documentation

4. **"Rate limit exceeded"**
   - SES has sending limits (200 emails/day in sandbox, higher in production)
   - Check your SES sending quota in the AWS Console

## Security Best Practices

1. **Use AWS Toolkit/IDE authentication (Recommended)**
   - More secure than hardcoding access keys
   - Automatic credential management
   - Works seamlessly with IAM Identity Center (SSO)
   - Credentials are stored securely by your IDE

2. **Never commit credentials to version control**
   - Use `.env.local` for development (already in `.gitignore`)
   - Use secure environment variable storage in production
   - If using access keys, never commit them to git

3. **Use IAM roles when possible**
   - In AWS environments (EC2, Lambda, etc.), use IAM roles instead of access keys
   - More secure and easier to manage
   - No credentials to rotate or manage

4. **Rotate access keys regularly** (if using access keys)
   - Change access keys periodically
   - Remove unused keys
   - Consider switching to AWS Toolkit to avoid this entirely

5. **Limit permissions**
   - Use the minimum required permissions (custom IAM policy)
   - Don't use `AmazonSESFullAccess` if you only need to send emails
   - Grant only `ses:SendEmail` and `ses:SendRawEmail` permissions
