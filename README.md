# Loan Management API

A comprehensive loan management system built with NestJS, TypeScript, and PostgreSQL, following SOLID principles and clean architecture.

## Features

- 🔐 **JWT Authentication** - Secure user authentication and authorization
- 👥 **Client Management** - Comprehensive client profile management
- 💰 **Loan Processing** - Complete loan application and approval workflow
- 📊 **Payment Calculations** - Advanced loan calculation algorithms
- 📅 **Installment Management** - Automated payment scheduling
- 💳 **Payment Processing** - Multiple payment method support
- 📧 **Notifications** - Email and SMS notification system
- 🔍 **API Documentation** - Interactive Swagger documentation
- ✅ **Data Validation** - Comprehensive input validation
- 🚦 **Rate Limiting** - API protection and throttling
- 📊 **Logging** - Structured logging with Winston
- 🐳 **Docker Support** - Containerized deployment

## Tech Stack

- **Framework**: NestJS 10
- **Language**: TypeScript 5.1
- **Database**: PostgreSQL 15
- **ORM**: TypeORM 0.3
- **Authentication**: JWT with Passport
- **Validation**: class-validator
- **Documentation**: Swagger/OpenAPI
- **Testing**: Jest
- **Code Quality**: ESLint + Prettier
- **Git Hooks**: Husky + lint-staged

## Project Structure

```
src/
├── auth/                    # Authentication module
├── clients/                # Client management module
├── loans/                  # Loan management module
├── installments/           # Installment management module
├── payments/               # Payment processing module
├── notifications/          # Notification system
├── shared/                 # Shared utilities
├── config/                 # Configuration files
└── database/              # Database related files
```

## Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL 15+
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd loan-software-control
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start PostgreSQL database**
   ```bash
   # Using Docker
   docker-compose up postgres -d
   
   # Or use your local PostgreSQL instance
   ```

5. **Run database migrations**
   ```bash
   npm run migration:run
   ```

6. **Start the development server**
   ```bash
   npm run start:dev
   ```

### Using Docker

1. **Start all services**
   ```bash
   docker-compose up -d
   ```

2. **View logs**
   ```bash
   docker-compose logs -f app
   ```

## API Documentation

Once the application is running, you can access:

- **API Base URL**: `http://localhost:3000/api/v1`
- **Swagger Documentation**: `http://localhost:3000/api/docs`
- **Health Check**: `http://localhost:3000/api/v1/health`

## Scripts

- `npm run start` - Start production server
- `npm run start:dev` - Start development server with hot reload
- `npm run build` - Build the application
- `npm run test` - Run unit tests
- `npm run test:e2e` - Run end-to-end tests
- `npm run test:cov` - Run tests with coverage
- `npm run lint` - Lint the code
- `npm run format` - Format the code with Prettier
- `npm run migration:generate` - Generate database migration
- `npm run migration:run` - Run database migrations
- `npm run migration:revert` - Revert database migration

## Development Guidelines

### SOLID Principles

This project strictly follows SOLID principles:

1. **Single Responsibility** - Each class has one reason to change
2. **Open/Closed** - Open for extension, closed for modification
3. **Liskov Substitution** - Derived classes must be substitutable for base classes
4. **Interface Segregation** - No client should depend on methods it doesn't use
5. **Dependency Inversion** - Depend on abstractions, not concretions

### Code Quality

- **ESLint** - Enforces coding standards and catches errors
- **Prettier** - Consistent code formatting
- **Husky** - Git hooks for quality assurance
- **Jest** - Unit and integration testing
- **Class Validator** - Runtime validation

### Git Workflow

1. **Pre-commit**: Linting, formatting, unit tests
2. **Pre-push**: E2E tests, build verification

## Testing

The project includes comprehensive testing:

- **Unit Tests**: Test individual components in isolation
- **Integration Tests**: Test component interactions
- **E2E Tests**: Test complete user workflows

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:cov
```

## Deployment

### Production Checklist

- [ ] Set production environment variables
- [ ] Configure database SSL
- [ ] Set up proper logging
- [ ] Configure CORS for production domain
- [ ] Set up database backups
- [ ] Configure monitoring and alerts
- [ ] Set up load balancing (if needed)

### Environment Variables

See `.env.example` for all required environment variables.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for your changes
5. Ensure all tests pass
6. Submit a pull request

## License

This project is licensed under the MIT License.