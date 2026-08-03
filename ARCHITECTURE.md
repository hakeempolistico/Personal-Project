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
Personal-Project/
├── apps/
│   ├── frontend/           # Next.js application
│   │   ├── app/            # App Router pages
│   │   │   ├── auth/       # Authentication pages
│   │   │   └── dashboard/   # Dashboard pages
│   │   ├── components/     # UI components
│   │   │   └── ui/         # shadcn/ui components
│   │   ├── lib/            # Utilities and API client
│   │   ├── hooks/          # Custom React hooks
│   │   ├── providers/      # Context providers
│   │   └── types/          # TypeScript types
│   │
│   └── backend/            # NestJS application
│       ├── src/
│       │   ├── modules/     # Feature modules
│       │   │   ├── auth/           # Authentication
│       │   │   ├── users/          # User management
│       │   │   ├── accounts/       # Bank accounts
│       │   │   ├── transactions/   # Financial transactions
│       │   │   ├── bills/          # Recurring bills
│       │   │   ├── loans/          # Loan tracking
│       │   │   ├── budgets/        # Budgets (placeholder)
│       │   │   ├── savings-goals/   # Savings goals (placeholder)
│       │   │   ├── reports/        # Reports (placeholder)
│       │   │   ├── notifications/  # Notifications (placeholder)
│       │   │   └── search/         # Search (placeholder)
│       │   ├── common/      # Shared utilities, decorators, guards
│       │   └── config/      # Configuration
│       └── prisma/
│           └── schema.prisma
│
├── docker-compose.yml      # Docker configuration
└── package.json            # Root workspace package.json
```

## Clean Architecture (Backend)

Each module follows Clean Architecture principles:

```
modules/{module-name}/
├── dto/                    # Data Transfer Objects
│   └── {entity}.dto.ts
├── {entity}.controller.ts  # API endpoints
├── {entity}.service.ts      # Business logic
└── {module-name}.module.ts
```

## Data Model

### Core Entities

- **User**: Authentication and profile data
- **Account**: Bank accounts, credit cards, wallets
- **Transaction**: Financial transactions
- **Bill**: Recurring bills and subscriptions
- **Loan**: Loan records with payment tracking
- **Budget**: Budget allocations
- **SavingsGoal**: Savings targets
- **Notification**: User notifications

### Entity Relationships

```
User
├── Accounts (1:N)
├── Transactions (1:N)
├── Bills (1:N)
├── Loans (1:N)
├── Budgets (1:N)
├── SavingsGoals (1:N)
└── Notifications (1:N)

Account
└── Transactions (1:N)

Loan
└── LoanPayments (1:N)
```

## Security

- All API routes protected with JWT authentication
- User data isolation at database level (every resource belongs to authenticated user)
- Password hashing with Bcrypt
- Input validation with class-validator
- CORS configuration enabled

## API Design

### RESTful Endpoints

#### Authentication (`/api/auth`)
```
POST   /api/auth/register     - Register new user
POST   /api/auth/login        - User login
POST   /api/auth/refresh      - Refresh access token
POST   /api/auth/logout       - Logout user (requires auth)
```

#### Users (`/api/users`)
```
GET    /api/users/profile     - Get user profile (requires auth)
PATCH  /api/users/profile     - Update user profile (requires auth)
PATCH  /api/users/password    - Change password (requires auth)
```

#### Accounts (`/api/accounts`)
```
GET    /api/accounts          - List all accounts (requires auth)
POST   /api/accounts          - Create account (requires auth)
GET    /api/accounts/total    - Get total balance (requires auth)
GET    /api/accounts/:id      - Get account by ID (requires auth)
PATCH  /api/accounts/:id      - Update account (requires auth)
DELETE /api/accounts/:id      - Delete account (requires auth)
```

#### Transactions (`/api/transactions`)
```
GET    /api/transactions            - List all transactions (requires auth)
POST   /api/transactions            - Create transaction (requires auth)
POST   /api/transactions/transfer   - Transfer money between accounts (requires auth)
GET    /api/transactions/stats      - Get monthly statistics (requires auth)
GET    /api/transactions/:id        - Get transaction by ID (requires auth)
PATCH  /api/transactions/:id        - Update transaction (requires auth)
DELETE /api/transactions/:id        - Delete transaction (requires auth)
```

#### Bills (`/api/bills`)
```
GET    /api/bills              - List all bills (requires auth)
POST   /api/bills              - Create bill (requires auth)
GET    /api/bills/upcoming     - Get upcoming bills (requires auth)
GET    /api/bills/:id          - Get bill by ID (requires auth)
PATCH  /api/bills/:id          - Update bill (requires auth)
PATCH  /api/bills/:id/paid     - Mark bill as paid (requires auth)
DELETE /api/bills/:id          - Delete bill (requires auth)
```

#### Loans (`/api/loans`)
```
GET    /api/loans                    - List all loans (requires auth)
POST   /api/loans                    - Create loan (requires auth)
GET    /api/loans/:id                - Get loan by ID (requires auth)
GET    /api/loans/:id/payments       - Get loan payments (requires auth)
POST   /api/loans/:id/payment        - Record payment (requires auth)
PATCH  /api/loans/:id                - Update loan (requires auth)
DELETE /api/loans/:id                - Delete loan (requires auth)
```

#### Placeholder Modules (API ready, frontend pending)
```
GET    /api/budgets          - Budgets (placeholder)
GET    /api/savings-goals    - Savings goals (placeholder)
GET    /api/reports          - Reports (placeholder)
GET    /api/notifications    - Notifications (placeholder)
GET    /api/search?q=        - Search (placeholder)
```

## Frontend Architecture

### Pages (App Router)

```
app/
├── page.tsx                 # Home page
├── layout.tsx              # Root layout
├── auth/
│   ├── login/
│   │   └── page.tsx
│   └── register/
│       └── page.tsx
└── dashboard/
    ├── layout.tsx          # Dashboard layout
    ├── page.tsx            # Dashboard home
    ├── accounts/
    │   └── page.tsx
    ├── transactions/
    │   ├── page.tsx
    │   └── [id]/
    │       └── page.tsx
    ├── bills/
    │   └── page.tsx
    └── loans/
        ├── page.tsx
        └── [id]/
            └── page.tsx
```

## Development Workflow

1. Create feature branch
2. Implement feature following Clean Architecture
3. Write unit tests
4. Run linting and type checking
5. Create PR for review
6. Merge to main after approval

## Environment Variables

### Backend (`apps/backend/.env`)
```
DATABASE_URL=postgresql://user:password@localhost:5432/finance_tracker
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret
PORT=3001
NODE_ENV=development
```

### Frontend (`apps/frontend/.env.local`)
```
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

## Docker Services

- **postgres**: PostgreSQL 15 database
- **backend**: NestJS API server (development)
- **frontend**: Next.js application (development)
