# Personal Finance Tracker - Architecture

## Overview

A modern, scalable personal finance tracking application built with Next.js and NestJS, inspired by Copilot Money, Monarch Money, and Linear.

## Tech Stack

### Frontend
- **Framework**: Next.js 14+ (App Router)
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
- **Runtime**: Node.js 20+

## Project Structure

```
personal-finance-tracker/
├── apps/
│   ├── frontend/           # Next.js application
│   │   ├── app/            # App Router pages
│   │   ├── components/    # UI components
│   │   ├── lib/            # Utilities and helpers
│   │   ├── hooks/          # Custom React hooks
│   │   ├── providers/      # Context providers
│   │   ├── types/          # TypeScript types
│   │   └── ...
│   │
│   └── backend/           # NestJS application
│       ├── src/
│       │   ├── modules/    # Feature modules (Clean Architecture)
│       │   │   ├── auth/
│       │   │   ├── users/
│       │   │   ├── accounts/
│       │   │   ├── categories/
│       │   │   ├── transactions/
│       │   │   ├── bills/
│       │   │   ├── loans/
│       │   │   ├── budgets/
│       │   │   ├── savings-goals/
│       │   │   ├── reports/
│       │   │   ├── notifications/
│       │   │   └── search/
│       │   ├── common/     # Shared utilities, decorators, guards
│       │   ├── config/     # Configuration
│       │   └── main.ts
│       └── prisma/
│           ├── schema.prisma
│           └── migrations/
│
├── docker/
│   └── ...
│
├── packages/
│   └── shared/            # Shared types and utilities
│       └── types/
│
├── docker-compose.yml
├── package.json           # Root workspace package.json
├── turbo.json             # Turborepo config
└── README.md
```

## Clean Architecture (Backend)

Each module follows Clean Architecture principles:

```
modules/{module-name}/
├── dto/                   # Data Transfer Objects
│   ├── create-{entity}.dto.ts
│   ├── update-{entity}.dto.ts
│   └── {entity}.response.dto.ts
├── entities/             # Domain entities
│   └── {entity}.entity.ts
├── repositories/         # Data access layer
│   └── {entity}.repository.ts
├── services/             # Business logic
│   └── {entity}.service.ts
├── controllers/          # API endpoints
│   └── {entity}.controller.ts
├── {module-name}.module.ts
└── {module-name}.spec.ts # Unit tests
```

## Data Model

### Core Entities

- **User**: Authentication and profile data
- **Account**: Bank accounts, credit cards, wallets
- **Category**: Income/expense categories
- **Transaction**: Financial transactions
- **Bill**: Recurring bills and subscriptions
- **Loan**: Loan records
- **Budget**: Budget allocations
- **SavingsGoal**: Savings targets
- **Notification**: User notifications

### Entity Relationships

```
User
├── Accounts (1:N)
├── Categories (1:N)
├── Transactions (1:N)
├── Bills (1:N)
├── Loans (1:N)
├── Budgets (1:N)
├── SavingsGoals (1:N)
└── Notifications (1:N)

Account
└── Transactions (1:N)

Category
└── Transactions (1:N)

Budget
└── Category (N:1)
```

## Security

- All API routes protected with JWT authentication
- User data isolation at database level (every resource belongs to authenticated user)
- Password hashing with Bcrypt
- Input validation with class-validator and Zod
- Rate limiting and CORS configuration

## API Design

### RESTful Endpoints

```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/refresh
POST   /api/auth/logout
GET    /api/auth/profile

GET    /api/accounts
POST   /api/accounts
GET    /api/accounts/:id
PATCH  /api/accounts/:id
DELETE /api/accounts/:id

GET    /api/categories
POST   /api/categories
GET    /api/categories/:id
PATCH  /api/categories/:id
DELETE /api/categories/:id

GET    /api/transactions
POST   /api/transactions
GET    /api/transactions/:id
PATCH  /api/transactions/:id
DELETE /api/transactions/:id

... (similar pattern for other resources)

GET    /api/reports/financial-summary
GET    /api/reports/spending-by-category
GET    /api/reports/income-vs-expenses

GET    /api/notifications

GET    /api/search?q=query
```

## Frontend Architecture

### Pages (App Router)

```
app/
├── (auth)/
│   ├── login/
│   └── register/
├── (dashboard)/
│   ├── layout.tsx         # Dashboard layout with sidebar
│   ├── page.tsx           # Dashboard home
│   ├── accounts/
│   ├── categories/
│   ├── transactions/
│   ├── bills/
│   ├── loans/
│   ├── budgets/
│   ├── savings-goals/
│   ├── reports/
│   └── settings/
├── api/                   # API route handlers (if needed)
└── layout.tsx
```

### Component Organization

```
components/
├── ui/                    # shadcn/ui base components
├── forms/                 # Form components
├── cards/                 # Card components
├── charts/                # Data visualization
├── layout/                # Layout components
│   ├── sidebar.tsx
│   ├── header.tsx
│   └── ...
└── {feature}/            # Feature-specific components
```

## Development Workflow

1. Create feature branch
2. Implement feature following Clean Architecture
3. Write unit tests
4. Run linting and type checking
5. Create PR for review
6. Merge to main after approval

## Environment Variables

### Backend (.env)
```
DATABASE_URL=postgresql://user:password@localhost:5432/finance_tracker
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret
PORT=3001
NODE_ENV=development
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

## Docker Services

- **postgres**: PostgreSQL 15 database
- **backend**: NestJS API server
- **frontend**: Next.js application (development)
