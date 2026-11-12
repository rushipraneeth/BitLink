# BitLink — Modern URL Shortener & Analytics

<div align="center">

![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-4.22-000000?style=for-the-badge&logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-1.0-C5F74F?style=for-the-badge&logo=drizzle&logoColor=black)
![License](https://img.shields.io/badge/License-ISC-blue?style=for-the-badge)

A high-performance, minimal URL shortening and analytics platform inspired by **Linear**, **Stripe**, and **Vercel**.  
Built with Node.js, Express, PostgreSQL, Drizzle ORM, and a sleek **Midnight Blue + Indigo + Teal** design system with full Light & Dark mode support.

[Features](#-key-features) • [Tech Stack](#-tech-stack) • [API Reference](#-api-endpoints) • [Quick Start](#-quick-start) • [Database Schema](#-database-schema) • [Testing](#-testing)

</div>

---

## ⚡ Key Features

### 1. 🏷️ Custom URL Aliases
- Users can customize link slugs (e.g., `domain.com/portfolio`, `domain.com/launch`).
- Input validation prevents illegal characters and enforces safe URL length.
- Automatic reservation protects system endpoints (`api`, `analytics`, `settings`, `verify`, etc.).
- Conflict detection returns clean **409 Conflict** errors for duplicate aliases.
- Fallback to cryptographically collision-safe 6-character random slugs when no alias is entered.

### 2. 📱 Instant QR Code Generation
- Automatically generates a QR code for every shortened link on creation.
- Downloadable high-resolution PNG format (`/qr/:code?download=1`).
- Clean QR code modal in the dashboard with one-click copy and download options.

### 3. ⏳ Link Expiration Engine
- Optional expiration timestamps with one-click presets (**24 Hours**, **7 Days**, **30 Days**).
- Redirection ceases immediately upon expiration, returning HTTP **410 Gone**.
- Dedicated branded **Link Expired** page informing visitors of link status.
- Dashboard tracks active vs. expired links in real time with status badges.

### 4. 📊 Real-Time Click Analytics
- Atomic click tracking in PostgreSQL (`clicks = clicks + 1`).
- Overview metrics: **Total Links**, **Total Clicks**, **Average Clicks/Link**, and **Active Ratio**.
- Interactive **Traffic Distribution Bar Chart** with dynamic tooltips and percentages.
- **Top-Performing Links Leaderboard** showing traffic share bars and rankings.

### 5. 🔒 Password-Protected Links
- Optional passcode protection for private or sensitive destinations.
- Secure salted **HMAC-SHA256** password hashing; passwords and salts are never stored in plain text and never exposed in API responses.
- Protected links present a dedicated **Password Verification Page** before redirecting.
- Timing-safe password comparison (`crypto.timingSafeEqual`) prevents timing attack vulnerabilities.

### 6. 🌓 Light / Dark Theme Management
- **Midnight Blue + Indigo + Teal** aesthetic inspired by modern developer tools.
- Top navigation toggle switches seamlessly between **Sun** (Dark) and **Moon** (Light) icons.
- Inline theme script eliminates Flash of Unstyled Theme (FOUT) on initial page load.
- Preference persists automatically across browser sessions in `localStorage`.

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Backend** | Node.js (ES Modules), Express.js |
| **Database & ORM** | PostgreSQL 17, Drizzle ORM, Drizzle Kit |
| **Validation & Auth** | Zod, JSON Web Tokens (`jsonwebtoken`), Node.js `crypto` |
| **Utilities** | `qrcode` (PNG streaming & Data URLs), `nanoid` |
| **Frontend** | Vanilla JavaScript (ES6+ SPA), CSS Custom Properties, Plus Jakarta Sans, JetBrains Mono |
| **Testing** | Node.js HTTP test suites (Integration & End-to-End) |

---

## 📂 Project Structure

```bash
URL-SHORTENER/
├── db/
│   ├── index.js             # Drizzle ORM client initialization
│   └── migrate.js           # Automated schema migration & index enforcement
├── middlewares/
│   └── auth.middleware.js   # JWT authentication & route guards
├── models/
│   ├── index.js             # Table exports
│   ├── url.model.js         # URLs table schema (aliases, clicks, expiration, passwords)
│   └── user.model.js        # Users table schema
├── public/
│   ├── index.html           # Single Page Application entry point
│   ├── styles.css           # Design tokens, themes (Light/Dark), and component styling
│   └── app.js               # Client-side state, API calls, theme manager, and UI bindings
├── routes/
│   ├── url.routes.js        # Shortening, redirection, analytics, QR, and verification
│   └── user.routes.js       # Signup, login, and user profile management
├── services/
│   └── user.service.js      # User query helpers
├── tests/
│   ├── test-backend.js      # 16 integration tests for core business logic
│   └── test-e2e.js          # 13 end-to-end tests for workflows & static routing
├── utils/
│   ├── hash.js              # Salted HMAC-SHA256 & timingSafeEqual validation
│   ├── pages.js             # Branded HTML templates (Verify, Expired, 404)
│   └── token.js             # JWT creation & verification
├── validations/
│   ├── request.validation.js # Zod schemas for request payloads
│   └── token.validation.js   # Zod schema for JWT tokens
├── docker-compose.yml       # Local PostgreSQL container service
├── drizzle.config.js        # Drizzle Kit configuration
├── index.js                 # Server entry point
└── package.json
```

---

## 🚀 Quick Start

### 1. Prerequisites
- [Node.js](https://nodejs.org/) v18 or higher
- [pnpm](https://pnpm.io/) package manager (`npm install -g pnpm`)
- [Docker](https://www.docker.com/) (for running PostgreSQL locally)

### 2. Clone and Install
```bash
git clone https://github.com/your-username/bitlink.git
cd bitlink
pnpm install
```

### 3. Configure Environment Variables
Create a `.env` file in the project root:
```env
PORT=8000
DATABASE_URL=postgresql://postgres:admin@localhost:5433/postgres
JWT_SECRET=your_super_secret_jwt_key_here
```

### 4. Start PostgreSQL (Docker)
```bash
docker compose up -d
```

### 5. Run Database Migrations
```bash
pnpm run db:migrate
```

### 6. Start the Server
```bash
# Development mode with hot-reloading
pnpm dev

# Or production mode
pnpm start
```

Visit **`http://localhost:8000`** in your browser.

> **Tip:** You can click **"Explore with One-Click Demo"** on the login screen to immediately test the dashboard without manual registration.

---

## 📡 API Endpoints

### 🔐 Authentication & Users
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/user/signup` | No | Register a new user account |
| `POST` | `/user/login` | No | Log in and receive a JWT token |
| `GET` | `/user/me` | Yes | Get the authenticated user's profile |
| `PATCH` | `/user/me` | Yes | Update user profile information |

### 🔗 URL Shortening & Management
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/shorten` | Yes | Create a shortened URL (supports alias, expiration, password) |
| `GET` | `/codes` | Yes | List all shortened links created by the user |
| `GET` | `/analytics` | Yes | Retrieve aggregate click counts, top links, and performance data |
| `DELETE`| `/:id` | Yes | Delete a shortened link by ID |

### 🌐 Redirection & Public Endpoints
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/:shortCode` | No | Public redirect (handles passwords and expiration automatically) |
| `GET` | `/qr/:shortCode` | No | Retrieve PNG QR code image (`?download=1` triggers file download) |
| `GET` | `/verify/:shortCode` | No | Render password verification page |
| `POST`| `/verify/:shortCode` | No | Submit password to unlock destination URL |
| `GET` | `/expired/:shortCode`| No | Render link expired notification page |
| `GET` | `/health` | No | Server health check endpoint |

---

## 🗄️ Database Schema

### `urls` Table
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | Primary Key | Auto-generated UUID |
| `code` | `varchar(155)` | Unique, Not Null | Short URL alias or slug |
| `target_url` | `text` | Not Null | Original destination URL |
| `user_id` | `uuid` | Foreign Key (`users.id`) | Creator reference |
| `clicks` | `integer` | Default `0`, Not Null | Total redirect count |
| `expires_at` | `timestamp` | Nullable | Optional expiration timestamp |
| `password` | `text` | Nullable | Salted HMAC-SHA256 password hash |
| `password_salt`| `text` | Nullable | Salt used for password verification |
| `created_at` | `timestamp` | Default `now()` | Record creation timestamp |
| `updated_at` | `timestamp` | Auto-update | Last modification timestamp |

### `users` Table
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | Primary Key | Auto-generated UUID |
| `first_name` | `varchar(55)` | Not Null | User's first name |
| `last_name` | `varchar(55)` | Nullable | User's last name |
| `email` | `varchar(255)` | Unique, Not Null | Account email |
| `password` | `text` | Not Null | Hashed password |
| `salt` | `text` | Not Null | Unique password salt |
| `created_at` | `timestamp` | Default `now()` | Account creation timestamp |

---

## 🧪 Testing

The application includes automated integration and end-to-end tests:

```bash
pnpm test
```

- **16 Integration Tests** (`tests/test-backend.js`):
  - User registration, login, profile retrieval, profile updates.
  - URL generation with random nanoid and custom aliases.
  - Reserved keyword prevention and 409 duplicate alias rejection.
  - Expiration validation, password hashing, and wrong-password rejection.
  - Atomic click increments, analytics calculation, and link deletion.
- **13 End-to-End Tests** (`tests/test-e2e.js`):
  - Static asset serving (HTML, CSS, JS) and SPA navigation routing.
  - Browser visits to password-protected links and unlock workflows.
  - HTTP 410 expired link handling.
  - QR Code PNG streaming and download header validation.

---

## 📄 License

This project is licensed under the [ISC License](LICENSE).
