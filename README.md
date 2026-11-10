# AI ExamGuard

Next-generation AI-powered online examination integrity platform with real-time in-browser face detection, audio analysis, and explainable risk indicators.

## Features

- 🎯 **Real-time Proctoring**: In-browser face detection and audio analysis
- 🔐 **Secure Exam Environment**: Tab switch detection and fullscreen enforcement
- 📊 **Risk Assessment**: Explainable AI-driven risk scoring
- 👥 **Multi-role Support**: Students, instructors, and administrators
- 📈 **Analytics Dashboard**: Comprehensive exam insights and reporting
- 🛡️ **Privacy-First**: All processing happens in the browser when possible

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS 4 + shadcn/ui
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **AI/ML**: MediaPipe (face detection), Web Audio API (audio analysis)
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 20.x or later
- npm or yarn
- Supabase account

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd ai-examguard
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```bash
cp .env.example .env.local
```

Edit `.env.local` and add your Supabase credentials.

4. Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Project Structure

```
ai-examguard/
├── src/
│   ├── app/              # Next.js App Router pages
│   ├── components/       # Reusable UI components
│   │   └── ui/          # shadcn/ui components
│   ├── features/        # Feature-specific modules
│   ├── hooks/           # Custom React hooks
│   ├── lib/             # Utilities and configurations
│   │   ├── api/        # API utilities
│   │   └── supabase/   # Supabase clients
│   ├── styles/          # Global styles
│   └── types/           # TypeScript type definitions
├── docs/                # Documentation
└── public/              # Static assets
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Environment Variables

See `.env.example` for required environment variables.

### Public Variables (exposed to browser)

- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` - Your Supabase publishable key

### Server Variables (server-only)

- `SUPABASE_SECRET_KEY` - Your Supabase secret key

## Documentation

- [Architecture](./docs/ARCHITECTURE.md)
- [Database Schema](./docs/DATABASE.md)
- [API Reference](./docs/API.md)
- [Security](./docs/SECURITY.md)
- [Testing](./docs/TESTING.md)
- [Implementation Plan](./docs/IMPLEMENTATION_PLAN.md)

## Contributing

Please read our contributing guidelines before submitting pull requests.

## License

See LICENSE file for details.

## Support

For questions or issues, please open a GitHub issue.
