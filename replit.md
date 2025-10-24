# GoonHub - Solana NSFW Creator Platform

## Overview

GoonHub is a Solana-based NSFW creator platform with a PornHub-inspired UI featuring a dark theme, masonry grid layout, and cryptocurrency integration. The platform allows creators to upload and monetize content using SOL payments and custom GOON tokens, while providing features like AI chat, tipping, and age-verified access controls.

## Recent Changes (October 2025)

- **AI Persona Enhancements** (October 24, 2025): Upgraded AI chat companions to highly erotic pornstar-like personalities with explicit content:
  - Enhanced xAI service with intensely sexual system prompts (temperature 0.95, top_p 0.98, 600 max tokens)
  - Updated AI personas (Amy, Mia, Una) with explicit, adult-oriented personalities and dialogue
  - Amy (Sweet & Naughty): Submissive personality with playful dirty talk
  - Mia (Seductive & Dominant): Commanding goddess with power dynamics and teasing
  - Una (Wild & Insatiable): Sex-crazed personality with intense explicit language
  - Created persona-specific system prompt generator for customized AI responses
  - Updated chat interface with more adult-oriented messaging and explicit fallback responses
  
- **Vercel Deployment Preparation** (October 24, 2025): Configured full-stack deployment to Vercel using serverless functions:
  - Created `api/index.ts` serverless function entry point for Express backend
  - Refactored Express app into reusable `server/app.ts` module
  - Updated `vercel.json` for monorepo deployment with both frontend and backend
  - Created comprehensive deployment documentation in `DEPLOYMENT.md`
  - Added `.env.example` template for required environment variables
  - Updated `.vercelignore` to exclude development files
  - Architecture supports deploying entire stack to Vercel with automatic scaling

- **Animated Goon Text**: Added hypnotic animated Chinese goon text banners that scroll across the top and bottom of the screen, with pulsing corner characters and a floating background GOON text. Features include:
  - Scrolling Chinese/GOON text banners with orange glow effects
  - Animated opacity pulsing for hypnotic effect
  - Responsive design that adapts to mobile and desktop
  - Non-intrusive pointer-events-none to allow interaction with page content

- **UI Simplification**: Removed the sidebar navigation from all pages to provide a cleaner, more immersive full-width layout. Navigation is now handled through:
  - Header navigation on desktop
  - Mobile bottom navigation bar on mobile devices

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The application uses a modern React-based frontend built with Vite and TypeScript:

- **Framework**: React 18 with TypeScript for type safety
- **Routing**: Wouter for lightweight client-side routing
- **Styling**: Tailwind CSS with custom design system featuring dark theme colors
- **UI Components**: Radix UI primitives with shadcn/ui component library
- **State Management**: TanStack Query for server state and caching
- **Wallet Integration**: Solana wallet adapter supporting Phantom, Solflare, and Backpack wallets

The design system follows a PornHub-inspired dark theme with custom colors:
- Background: `#0B0B0B` (very dark gray)
- Panels: `#121212` (dark gray)
- Text: `#EAEAEA` (light gray)
- Accent: `#F9A11B` (orange for GOON branding)

### Backend Architecture
The backend is built using Express.js with a modular design:

- **Server Framework**: Express.js with TypeScript
- **API Design**: RESTful endpoints for posts, users, tokens, payments, and chat
- **Storage Layer**: Abstract storage interface with in-memory implementation (extensible to database)
- **File Handling**: Support for media uploads with size limits and validation
- **Rate Limiting**: Configured for API protection

Key API endpoints include:
- `/api/posts` - Content management (CRUD operations)
- `/api/chat` - AI chat functionality
- `/api/tokens` - GOON token operations
- `/api/purchases` - Payment processing

### Database Schema
The application uses Drizzle ORM with PostgreSQL, featuring these main entities:

- **Users**: Solana public key as ID, handles, avatars, age verification
- **Posts**: Media content with pricing, visibility controls, and engagement metrics
- **Tokens**: Custom GOON token metadata and supply information
- **Purchases**: Transaction records linking users to unlocked content
- **Tips**: Creator tipping system with SOL payments
- **AI Personas**: Custom AI chat personalities for creators
- **Chat Messages**: Conversation history between users and AI

The schema supports content visibility levels (public, subscribers, goon-gated) and tracks engagement metrics like views and likes.

### Authentication & Authorization
- **Wallet-Based Auth**: Uses Solana wallet connections instead of traditional passwords
- **Age Verification**: Required checkbox for accessing NSFW content
- **Role-Based Access**: Distinguishes between regular users and verified creators
- **Content Gating**: Support for SOL-priced content and GOON token requirements

### External Dependencies

- **Solana Integration**: 
  - `@solana/web3.js` for blockchain interactions
  - `@solana/wallet-adapter-react` for wallet connectivity
  - Neon Database serverless for PostgreSQL hosting
  - Helius RPC for reliable Solana network access

- **Database & Storage**:
  - Drizzle ORM for type-safe database operations
  - PostgreSQL as primary database
  - DigitalOcean Spaces planned for media storage (S3-compatible)

- **AI Services**:
  - xAI Grok API for AI chat functionality
  - Custom content moderation using AI

- **Development Tools**:
  - Vite for fast development and building
  - TanStack Query for data fetching and caching
  - React Hook Form with Zod for form validation
  - Framer Motion for animations

- **Deployment & Monitoring**:
  - Vercel for full-stack hosting (frontend + serverless backend)
  - Backend runs as Node.js serverless functions
  - Frontend served from global CDN
  - Upstash Redis for rate limiting
  - Sentry and PostHog for observability (planned)

The architecture prioritizes scalability with its modular design, type safety throughout the stack, and cryptocurrency-native payment processing while maintaining a familiar social media user experience.