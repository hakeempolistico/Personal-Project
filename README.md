# Personal Finance Tracker

A modern, scalable, and production-ready Personal Finance Tracker application built with Next.js, NestJS, PostgreSQL, and Prisma.

## Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Components**: shadcn/ui
- **Forms**: React Hook Form + Zod
- **Data Fetching**: TanStack Query

### Backend
- **Framework**: NestJS
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: JWT + Passport + Bcrypt
- **API Documentation**: Swagger

### Infrastructure
- **Containerization**: Docker + Docker Compose

## Features (Planned)

1. ✅ Project setup (Next.js, NestJS, PostgreSQL, Prisma, Docker)
2. 🔄 Authentication (Register, Login, Logout, Refresh Token, User Profile)
3. ⬜ Dashboard
4. ⬜ Accounts
5. ⬜ Categories
6. ⬜ Transactions (Income, Expenses, Transfers)
7. ⬜ Bills
8. ⬜ Loans
9. ⬜ Budgets
10. ⬜ Savings Goals
11. ⬜ Reports
12. ⬜ Notifications
13. ⬜ Global Search

## Getting Started

### Prerequisites

- Node.js 20+
- Docker and Docker Compose
- npm or pnpm

### Development Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Start Docker containers:
   ```bash
   npm run docker:up
   ```

4. Generate Prisma client:
   ```bash
   npm run db:generate
   ```

5. Run database migrations:
   ```bash
   npm run db:migrate
   ```

6. Start the development servers:
   ```bash
   npm run dev
   ```

### Accessing the Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Swagger Documentation: http://localhost:3001/api/docs
- Prisma Studio: `npm run prisma:studio -w @finance-tracker/backend`

## Project Structure

```
personal-finance-tracker/
├── apps/
│   ├── frontend/           # Next.js application
│   └── backend/            # NestJS application
├── docker/                 # Docker configuration
└── packages/               # Shared packages
```

## Docker Commands

```bash
# Start all services
npm run docker:up

# Stop all services
npm run docker:down

# View logs
npm run docker:logs
```

## Environment Variables

Copy the `.env.example` files to `.env` in their respective directories and update the values.

## License

MIT
