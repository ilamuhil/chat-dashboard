# Chat Dashboard

A comprehensive dashboard application for business users to configure and manage their embeddable chatbot widgets. This dashboard provides an intuitive interface for customizing bot behavior, managing conversations, and analyzing chatbot performance.

## Overview

This repository contains the **dashboard application** for users who integrate our embeddable chatbot widget into their websites or applications. Business users can:

- **Configure chatbot settings** - Customize bot appearance, behavior, and responses
- **Manage bot conversations** - View and respond to user interactions
- **Analyze performance** - Track metrics and insights about chatbot usage
- **Manage multiple bots** - Create and configure multiple chatbot instances
- **Set up integrations** - Connect chatbots to various services and APIs

## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) with App Router
- **Database & Auth**: [Supabase](https://supabase.com/) - PostgreSQL database with built-in authentication
- **Styling**: Tailwind CSS with shadcn/ui components
- **Form Management**: React Hook Form with Zod validation
- **Language**: TypeScript

## Project Structure

```
chat_dashboard/
├── app/                          # Next.js App Router directory
│   ├── api/                      # API routes (server-side endpoints)
│   ├── auth/                     # Authentication pages
│   │   ├── login/
│   │   │   └── page.tsx          # Login page
│   │   └── signup/
│   │       └── page.tsx          # Signup page
│   ├── dashboard/                # Dashboard pages (to be implemented)
│   │   ├── layout.tsx            # Dashboard layout with sidebar/nav
│   │   ├── page.tsx              # Dashboard home/overview
│   │   ├── bots/                 # Bot management
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
│   └── dashboard/                # Dashboard-specific components (to be implemented)
│       ├── Sidebar.tsx           # Dashboard navigation sidebar
│       ├── BotCard.tsx           # Bot display card
│       ├── ConversationList.tsx  # List of conversations
│       └── AnalyticsChart.tsx     # Analytics visualization
│
├── lib/                          # Utility functions and configurations
│   ├── supabase.ts               # Supabase client initialization
│   ├── utils.ts                  # General utilities (cn function, etc.)
│   └── supabase-auth-example.ts  # Authentication examples
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

## Dashboard Structure (Planned)

The dashboard will be organized into the following main sections:

### 1. **Dashboard Overview** (`/dashboard`)
- Welcome screen with quick stats
- Recent activity feed
- Quick actions (create bot, view conversations, etc.)

### 2. **Bot Management** (`/dashboard/bots`)
- **List View** (`/dashboard/bots`) - Grid/list of all configured bots
- **Bot Details** (`/dashboard/bots/[id]`) - Individual bot configuration
  - General settings (name, description, avatar)
  - Behavior configuration (responses, triggers)
  - Appearance customization (colors, theme)
  - Integration settings
- **Analytics** (`/dashboard/bots/[id]/analytics`) - Bot-specific metrics
- **Create New Bot** (`/dashboard/bots/new`) - Bot creation wizard

### 3. **Conversations** (`/dashboard/conversations`)
- List all conversations across all bots
- Filter by bot, date, status
- Individual conversation view with chat history
- Ability to respond as bot or escalate to human

### 4. **Integrations** (`/dashboard/integrations`)
- Connect to external services (CRM, email, etc.)
- API key management
- Webhook configuration

### 5. **Settings** (`/dashboard/settings`)
- User profile settings
- Account management
- Billing/subscription (if applicable)
- Team management (if multi-user)

## Getting Started

### Prerequisites

- Node.js 18+ and pnpm (or npm/yarn)
- Supabase account and project

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
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Run the development server:
```bash
pnpm dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Authentication

The application uses Supabase Auth for user authentication. Users can:
- Sign up with email/password
- Sign in to access the dashboard
- Reset passwords via email

Authentication pages are located in `app/auth/` and use the `AuthForm` component.

## Database Schema (Supabase)

The application uses Supabase's PostgreSQL database. Key tables include:

- `auth.users` - Managed automatically by Supabase Auth
- `profiles` - User profile information (to be created)
- `bots` - Chatbot configurations (to be created)
- `conversations` - Chat conversations (to be created)
- `messages` - Individual messages in conversations (to be created)

## Development

### Code Style

- TypeScript for type safety
- ESLint for code quality
- Prettier for code formatting (if configured)

### Component Structure

- Use functional components with TypeScript
- Client components marked with `"use client"` directive
- Server components by default (App Router)
- Reusable UI components in `components/ui/`
- Feature-specific components in `components/[feature]/`

## Deployment

The application can be deployed on [Vercel](https://vercel.com) (recommended for Next.js) or any platform that supports Next.js.

1. Push your code to a Git repository
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [shadcn/ui Components](https://ui.shadcn.com/)

## License

[Add your license here]
