# Chat Dashboard

The Next.js dashboard for configuring chatbot bots, managing conversations and
leads, uploading training sources, and administering organization members.

## Stack

- Next.js 16 App Router and React 19
- TypeScript, Tailwind CSS v4, and Radix/shadcn-style UI components
- PostgreSQL accessed through Prisma 7
- Resend for transactional email
- Cloudflare R2-compatible storage for uploaded training files
- JWT-based authentication with email OTP and organization selection

## Current project structure

```
chat_dashboard/
├── app/                          # Next.js App Router directory
│   ├── api/                      # API routes (server-side endpoints)
│   ├── auth/                     # Authentication pages
│   │   ├── login/
│   │   │   └── page.tsx          # Login page
│   │   └── signup/
│   │       └── page.tsx          # Signup page
│   ├── dashboard/                # Implemented dashboard pages
│   │   ├── layout.tsx            # Dashboard layout with sidebar/nav
│   │   ├── page.tsx              # Dashboard home/overview
│   │   ├── bot/                  # Bot configuration, training, and API
│   │   │   ├── page.tsx          # List all bots
│   │   │   ├── [id]/             # Individual bot pages
│   │   │   │   ├── page.tsx      # Bot details/configuration
│   │   │   │   ├── settings/     # Bot settings
│   │   │   │   └── analytics/    # Bot analytics
│   │   │   └── new/              # Create new bot
│   │   ├── conversations/        # Conversation management
│   │   │   ├── page.tsx          # List conversations
│   │   │   └── [id]/             # Individual conversation view
│   │   ├── integrations/         # Third-party integrations
│   │   └── settings/             # User/account settings
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Landing/home page
│   └── globals.css               # Global styles
│
├── components/                   # React components
│   ├── auth/                     # Authentication components
│   │   ├── AuthForm.tsx          # Login/signup form
│   │   └── ConfirmationDialog.tsx
│   ├── ui/                       # Reusable UI components (shadcn/ui)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   └── ...
│   └── dashboard/                # Shared dashboard components
│       ├── Sidebar.tsx           # Dashboard navigation sidebar
│       ├── BotCard.tsx           # Bot display card
│       ├── ConversationList.tsx  # List of conversations
│       └── AnalyticsChart.tsx     # Analytics visualization
│
├── lib/                          # Utility functions and configurations
│   ├── prisma.ts                 # Prisma client initialization
│   └── utils.ts                  # General utilities (cn function, etc.)
│
├── public/                       # Static assets
│   └── ...                       # Images, icons, etc.
│
├── .env.local                    # Environment variables (not committed)
├── next.config.ts                # Next.js configuration
├── tailwind.config.ts            # Tailwind CSS configuration
├── tsconfig.json                 # TypeScript configuration
└── package.json                  # Dependencies and scripts
```

## Dashboard routes

The implemented routes are listed below. The older tree in the section below is
kept as a rough directory illustration; route names in this list are
authoritative.

- `/dashboard` and `/dashboard/overview` — overview
- `/dashboard/bot/interactions` — bot creation and configuration
- `/dashboard/bot/training` — URLs, files, and training progress
- `/dashboard/bot/api` — API keys and embed code
- `/dashboard/users/conversations` and `/dashboard/users/conversations/[id]`
  — conversation list and details
- `/dashboard/users/leads` and `/dashboard/users/leads/[lead_id]`
  — leads and follow-ups
- `/dashboard/users/org-members` — organization members
- `/dashboard/notifications` — user notifications
- `/dashboard/profile` — organization profile
- `/dashboard/subscription` — subscription display

There are no implemented `/dashboard/bots`, `/dashboard/integrations`, or
generic `/dashboard/settings` route trees.

### Historical route notes (superseded)

The following old planning notes are retained only for context and are not
implemented route names:
- Welcome screen with quick stats
- Recent activity feed
- Quick actions (create bot, view conversations, etc.)

### 2. Bot Management (historical)
- **List View** (`/dashboard/bots`) - Grid/list of all configured bots
- **Bot Details** (`/dashboard/bots/[id]`) - Individual bot configuration
  - General settings (name, description, avatar)
  - Behavior configuration (responses, triggers)
  - Appearance customization (colors, theme)
  - Integration settings
- **Analytics** (`/dashboard/bots/[id]/analytics`) - Bot-specific metrics
- **Create New Bot** (`/dashboard/bots/new`) - Bot creation wizard

### 3. Conversations (historical)
- List all conversations across all bots
- Filter by bot, date, status
- Individual conversation view with chat history
- Ability to respond as bot or escalate to human

### 4. Integrations (historical)
- Connect to external services (CRM, email, etc.)
- API key management
- Webhook configuration

### 5. Settings (historical)
- User profile settings
- Account management
- Billing/subscription (if applicable)
- Team management (if multi-user)

## Getting Started

### Prerequisites

- Node.js 20.9+ and pnpm 11
- PostgreSQL database

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd chat_dashboard
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
Create a `.env.local` file in the root directory:
```env
# ------------  client side public env variables prefix with NEXT_PUBLIC_ -------- #

NEXT_PUBLIC_APP_NAME=
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_PYTHON_SERVER_URL=


# ------------- server-side environment variables ------------- #
APP_URL=
PYTHON_API_URL=
CHAT_FILE_BUCKET=
R2_ACCOUNT_ID=
R2_API_KEY_TOKEN=
R2_API_KEY=
CLOUDFLARE_R2_BASE_URL=
ACCESS_KEY_ID=
SECRET_ACCESS_KEY=
RESEND_API_KEY=
RESEND_FROM_EMAIL=
RESEND_FROM_NAME=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:4000/api/auth/google/callback
DATABASE_URL=
AUTH_JWT_SECRET=
```

4. Run the development server:
```bash
pnpm dev
```

5. Open [localhost:4000](http://localhost:4000) in your browser.

## Google sign-in

Google sign-in requests only the `openid`, `email`, and `profile` scopes.
Register the callback URL below in Google Cloud Console:

```text
http://localhost:4000/api/auth/google/callback
```

For production, set `GOOGLE_REDIRECT_URI` to the deployed HTTPS callback URL.
Existing email-OTP and invited accounts are not linked automatically to Google;
they should continue using email OTP.

## Authentication

Authentication lives in `app/auth/` and uses JWT sessions, email OTP flows,
magic-link organization invitations, and organization selection. API requests
are scoped to the authenticated user's current organization.

## Database schema

`prisma/schema.prisma` is the authoritative schema and `prisma/migrations`
contains the migrations. `prisma.config.ts` loads `.env.local` before `.env`
and supplies `DATABASE_URL` to Prisma. See `chat_db_schema.txt` for a readable
summary.

## Development


### Component Structure

- Use functional components with TypeScript
- Client components marked with `"use client"` directive
- Server components by default (App Router)
- Reusable UI components in `components/ui/`
- Feature-specific components in `components/[feature]/`


## Documentation links

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [shadcn/ui Components](https://ui.shadcn.com/)

