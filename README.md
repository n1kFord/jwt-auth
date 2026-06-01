# 🔐 JWT Authentication API

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org/) [![Express.js Version](https://img.shields.io/badge/express-5.x-blue)](https://expressjs.com/) [![MongoDB](https://img.shields.io/badge/mongodb-6.x-green)](https://www.mongodb.com/) [![Redis](https://img.shields.io/badge/redis-7.x-red)](https://redis.io/) [![License](https://img.shields.io/badge/license-MIT-green)](./LICENSE) [![Tests](https://github.com/n1kFord/jwt-auth/actions/workflows/test.yml/badge.svg)](https://github.com/n1kFord/jwt-auth/actions/workflows/test.yml) [![Code Style](https://img.shields.io/badge/code_style-prettier-ff69b4)](https://prettier.io/) [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen)](https://github.com/n1kFord/jwt-auth-api/pulls)

> 🚀 Production-ready JWT authentication API with refresh tokens, CSRF protection, and Redis storage.

> 📚 **Educational project** for learning modern authentication patterns with Node.js.

## ✨ Features

- 🔑 **JWT Access & Refresh Tokens** with automatic rotation
- 🛡️ **CSRF Protection** (Double Submit Cookie pattern)
- 📦 **Redis** for persistent refresh token storage
- 🚦 **Rate limiting** to prevent brute force attacks
- 🪵 **Winston + Morgan** logging with chalk styling
- 🧪 **Comprehensive test suite** with Jest & Supertest
- ✨ **ESLint + Prettier** for code quality
- 🐳 **Docker Compose** for easy development

## 🛠️ Tech Stack

- **Runtime**: Node.js 20+
- **Framework**: Express.js 5.x
- **Database**: MongoDB + Mongoose
- **Cache**: Redis (refresh tokens)
- **Security**: bcrypt, JWT, CSRF, rate limiting
- **Logging**: Winston, Morgan, Chalk
- **Testing**: Jest + Supertest
- **Code Quality**: ESLint + Prettier

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose

### Installation

```bash
# Clone repository
git clone https://github.com/n1kFord/jwt-auth.git
cd jwt-auth-api

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Start MongoDB and Redis
docker-compose up -d

# Run development server
npm run dev
```

### Environment Variables

```env
PORT=8080
MONGO_URI=mongodb://localhost:27017/authDB
REDIS_CLIENT_URI=redis://localhost:6379
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret
```

## 📁 Project Structure

```
jwt-auth-api/
├── src/
│   ├── config/          # Configuration (DB, Redis, constants)
│   ├── middlewares/     # Auth, CSRF, validation, logging
│   ├── models/          # User model
│   ├── routers/         # /auth and /me endpoints
│   ├── store/           # Redis token storage
│   ├── utils/           # Helpers (tokens, logger, hash, cookies)
│   ├── __tests__/       # Jest tests
│   └── index.js         # Entry point
├── logs/                # Winston log files
├── docker-compose.yml
├── Dockerfile
└── package.json
```

## 📝 Logging

- **Winston** — file + console logging with levels (error, warn, info, debug)
- **Morgan** — HTTP request logging integrated with Winston
- **Chalk** — colored console output

## 🎨 Code Style

```bash
npm run lint        # Check code style
npm run format      # Auto-format with Prettier
```

## 🔌 API Endpoints

### Auth (`/auth`)

| Method | Endpoint    | Description    | CSRF |
| ------ | ----------- | -------------- | ---- |
| POST   | `/register` | Register user  | ❌   |
| POST   | `/login`    | Login user     | ❌   |
| POST   | `/refresh`  | Refresh tokens | ✅   |
| POST   | `/logout`   | Logout         | ❌   |

### User (`/me`)

| Method | Endpoint           | Description     | CSRF |
| ------ | ------------------ | --------------- | ---- |
| GET    | `/`                | Get profile     | ❌   |
| POST   | `/change-email`    | Change email    | ✅   |
| POST   | `/change-password` | Change password | ✅   |
| POST   | `/change-username` | Change username | ✅   |
| POST   | `/change-bio`      | Change bio      | ✅   |
| DELETE | `/`                | Delete account  | ✅   |

## 📝 Examples

### Register

```bash
curl -X POST http://localhost:8080/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"secret123","confirmPassword":"secret123"}'
```

### Login

```bash
curl -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"secret123"}'
```

### Get Profile (with CSRF)

```bash
curl -X GET http://localhost:8080/me/ \
  -H "x-csrf-token: your-csrf-token" \
  -H "Cookie: token=access-token; XSRF-TOKEN=csrf-token"
```

## 🧪 Testing

```bash
npm test
```

## 🐳 Docker

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down
```

## 🔧 Environment Variables

| Variable             | Description                 |
| -------------------- | --------------------------- |
| `PORT`               | Server port (default: 8080) |
| `MONGO_URI`          | MongoDB connection string   |
| `REDIS_CLIENT_URI`   | Redis connection string     |
| `JWT_SECRET`         | Secret for access tokens    |
| `JWT_REFRESH_SECRET` | Secret for refresh tokens   |

## 🛡️ Security

- **JWT** with short-lived access tokens (15min) and long-lived refresh tokens (7d)
- **Token rotation** — new refresh token on each refresh
- **CSRF protection** — Double Submit Cookie pattern
- **Rate limiting** — 100 req/15min global, 10 login attempts
- **HTTP-only cookies** — prevents XSS attacks
- **Bcrypt** for password hashing

## 🤝 Contributing

Contributions are welcome! Feel free to open issues and pull requests.

## 📄 License

MIT © [n1kFord](https://github.com/n1kFord)

---

**⭐ Star this repo if you found it helpful!**
