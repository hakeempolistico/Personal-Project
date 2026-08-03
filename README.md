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

## Features

| Feature | Status | Description |
|---------|--------|-------------|
| Project Setup | ✅ Complete | Next.js, NestJS, PostgreSQL, Prisma, Docker |
| Authentication | ✅ Complete | Register, Login, Logout, Refresh Token, User Profile |
| Accounts | ✅ Complete | CRUD operations, total balance calculation |
| Transactions | ✅ Complete | CRUD operations, monthly statistics |
| Bills | ✅ Complete | CRUD operations, mark as paid, upcoming bills |
| Loans | ✅ Complete | CRUD operations, payment tracking |
| Categories | 🔄 Partial | API structure ready, frontend pending |
| Budgets | 🔄 Partial | API structure ready, frontend pending |
| Savings Goals | 🔄 Partial | API structure ready, frontend pending |
| Reports | 🔄 Partial | API structure ready, frontend pending |
| Notifications | 🔄 Partial | API structure ready, frontend pending |
| Search | 🔄 Partial | API structure ready, frontend pending |

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
   docker compose up -d postgres
   ```

4. Generate Prisma client:
   ```bash
   cd apps/backend && npx prisma generate
   ```

5. Run database migrations:
   ```bash
   cd apps/backend && npx prisma migrate dev --name init
   ```

6. Start the development servers:
   ```bash
   # Terminal 1: Backend
   cd apps/backend && npm run start:dev

   # Terminal 2: Frontend
   cd apps/frontend && npm run dev
   ```

### Accessing the Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001/api
- Swagger Documentation: http://localhost:3001/api/docs
- Prisma Studio: `cd apps/backend && npx prisma studio`

## API Endpoints

### Authentication (`/api/auth`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | User login |
| POST | `/auth/refresh` | Refresh access token |
| POST | `/auth/logout` | Logout user |

### Users (`/api/users`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users/profile` | Get user profile |
| PATCH | `/users/profile` | Update user profile |
| PATCH | `/users/password` | Change password |

### Accounts (`/api/accounts`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/accounts` | List all accounts |
| POST | `/accounts` | Create account |
| GET | `/accounts/total` | Get total balance |
| GET | `/accounts/:id` | Get account by ID |
| PATCH | `/accounts/:id` | Update account |
| DELETE | `/accounts/:id` | Delete account |

### Transactions (`/api/transactions`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/transactions` | List all transactions |
| POST | `/transactions` | Create transaction |
| GET | `/transactions/stats` | Get monthly statistics |
| GET | `/transactions/:id` | Get transaction by ID |
| PATCH | `/transactions/:id` | Update transaction |
| DELETE | `/transactions/:id` | Delete transaction |

### Bills (`/api/bills`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/bills` | List all bills |
| POST | `/bills` | Create bill |
| GET | `/bills/upcoming` | Get upcoming bills |
| GET | `/bills/:id` | Get bill by ID |
| PATCH | `/bills/:id` | Update bill |
| PATCH | `/bills/:id/paid` | Mark bill as paid |
| DELETE | `/bills/:id` | Delete bill |

### Loans (`/api/loans`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/loans` | List all loans |
| POST | `/loans` | Create loan |
| GET | `/loans/:id` | Get loan by ID |
| GET | `/loans/:id/payments` | Get loan payments |
| POST | `/loans/:id/payment` | Record payment |
| PATCH | `/loans/:id` | Update loan |
| DELETE | `/loans/:id` | Delete loan |

## Project Structure

```
Personal-Project/
├── apps/
│   ├── frontend/           # Next.js application
│   │   ├── app/             # App Router pages
│   │   ├── components/      # UI components
│   │   ├── lib/             # Utilities and API client
│   │   └── hooks/           # Custom React hooks
│   └── backend/             # NestJS application
│       ├── src/
│       │   ├── modules/     # Feature modules
│       │   ├── common/      # Shared utilities
│       │   └── config/      # Configuration
│       └── prisma/          # Database schema
├── docker-compose.yml       # Docker configuration
└── package.json             # Root workspace
```

## Docker Commands

```bash
# Start PostgreSQL
docker compose up -d postgres

# Stop all services
docker compose down

# View logs
docker compose logs -f
```

## Environment Variables

### Backend (`apps/backend/.env`)
```
DATABASE_URL=postgresql://finance_user:finance_password@localhost:5432/finance_tracker
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret
PORT=3001
NODE_ENV=development
```

### Frontend (`apps/frontend/.env.local`)
```
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

## License

MIT
