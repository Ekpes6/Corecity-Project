# 🏠 corecity Properties Nigeria

Nigeria's full-stack real estate platform built with Java (Spring Boot microservices), React, and MySQL.

---

## 🏗️ Architecture Overview

```
                        ┌─────────────────────────────────────┐
                        │         React Frontend (Port 3000)   │
                        └──────────────────┬──────────────────┘
                                           │ HTTP
                        ┌──────────────────▼──────────────────┐
                        │     API Gateway — Spring Cloud       │
                        │     Port 8080 · JWT Auth Filter      │
                        └──────┬──────┬──────┬──────┬─────────┘
                               │      │      │      │
              ┌────────────────┘  ┌───┘  ┌──┘  ┌───┘
              ▼                   ▼      ▼     ▼
     ┌─────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
     │ User Service│  │Property Svc  │  │  File Svc    │  │Transaction   │  │Notification  │
     │  Port 8081  │  │  Port 8082   │  │  Port 8083   │  │  Port 8084   │  │  Port 8085   │
     │  Auth · JWT │  │Search·CRUD   │  │Upload·Resize │  │Paystack API  │  │Email · SMS   │
     └──────┬──────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
            │                │                  │                  │                  │
            └────────────────┴──────────────────┴────────┬─────────┴──────────────────┘
                                                          │
                        ┌─────────────────────────────────┴───────────────┐
                        │          MySQL 8.0            RabbitMQ           │
                        │          Port 3306            Port 5672          │
                        └─────────────────────────────────────────────────┘
```

## 📦 Services Summary

| Service | Port | Responsibility |
|---------|------|----------------|
| **API Gateway** | 8080 | Route requests, validate JWT, CORS |
| **User Service** | 8081 | Registration, login, JWT issuance |
| **Property Service** | 8082 | CRUD listings, full-text search, state/LGA filter |
| **File Service** | 8083 | Image upload, thumbnail generation, file serving |
| **Transaction Service** | 8084 | Paystack integration, payment verification |
| **Notification Service** | 8085 | Email (SMTP) + SMS (Termii Nigeria) via RabbitMQ |
| **MySQL** | 3306 | Shared relational database |
| **RabbitMQ** | 5672 | Async event messaging between services |
| **React Frontend** | 3000 | Full UI — browse, search, list, pay |

---

## 🇳🇬 Nigerian-Specific Features

- **Paystack** payment gateway with NGN (₦) — card, bank transfer, USSD, QR
- **Termii** SMS API for OTPs and alerts to Nigerian numbers (+234)
- **37 states + all 774 LGAs** pre-seeded in the database
- Phone validation for Nigerian numbers (080x, 081x, 090x, 070x)
- **BVN / NIN** fields for identity verification
- Nigerian property types: Bungalow, Duplex, Terraced, Semi-Detached, BQ
- Amenities localised for Nigeria: Borehole, Generator, Prepaid Meter, BQ, POP Ceiling
- Prices in Naira with periods: Outright / Per Year / Per Month / Per Night

---

## 🚀 Quick Start (Docker — Recommended)

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed
- 4 GB RAM available

### 1. Clone and configure

```bash
git clone https://github.com/yourorg/corecity.git
cd corecity

# Copy and edit the environment file
cp .env.example .env
```

Edit `.env` and fill in:
- `PAYSTACK_SECRET_KEY` — from [Paystack Dashboard](https://dashboard.paystack.com/#/settings/developers)
- `TERMII_API_KEY` — from [Termii](https://app.termii.com/)
- `SMTP_*` — your email credentials
- Change all `*_PASSWORD` values

### 2. Start everything

```bash
docker-compose up --build
```

Wait ~2 minutes for all services to start. Then open:

Note: inside Docker Compose, Spring services must use `mysql` and `rabbitmq` as hostnames because those names are resolved on the internal Compose network. From your host machine, use `localhost` with the published ports.

| URL | Service |
|-----|---------|
| http://localhost:3000 | corecity Frontend |
| http://localhost:8080 | API Gateway |
| http://localhost:15672 | RabbitMQ Dashboard (guest/guest) |
| localhost:3307 | MySQL |

### 3. Stop

```bash
docker-compose down          # stop
docker-compose down -v       # stop + delete data volumes
```

---

## 💻 Local Development (Without Docker)

### Prerequisites

```bash
# Verify versions
java --version        # Java 21+
mvn --version         # Maven 3.9+
node --version        # Node 18+
mysql --version       # MySQL 8.0+
```

### 1. Database setup

```sql
-- In MySQL shell:
CREATE DATABASE corecity_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'corecity_user'@'localhost' IDENTIFIED BY 'corecity_pass';
GRANT ALL PRIVILEGES ON corecity_db.* TO 'corecity_user'@'localhost';
FLUSH PRIVILEGES;

-- Run the init script:
mysql -u corecity_user -p corecity_db < database/init.sql
```

### 2. RabbitMQ

```bash
# macOS
brew install rabbitmq && brew services start rabbitmq

# Ubuntu/Debian
sudo apt install rabbitmq-server && sudo systemctl start rabbitmq-server

# Docker (quickest)
docker run -d -p 5672:5672 -p 15672:15672 rabbitmq:3-management
```

### 3. Start Java microservices

Open a terminal for each service:

Note: local Maven runs use `localhost` for MySQL and RabbitMQ. The Compose-only hostnames `mysql` and `rabbitmq` will fail outside Docker unless you override them in your environment or hosts configuration.

```bash
# Terminal 1 — User Service
cd backend/user-service
mvn spring-boot:run

# Terminal 2 — Property Service
cd backend/property-service
mvn spring-boot:run

# Terminal 3 — File Service
cd backend/file-service
mvn spring-boot:run

# Terminal 4 — Transaction Service
cd backend/transaction-service
mvn spring-boot:run

# Terminal 5 — Notification Service
cd backend/notification-service
mvn spring-boot:run

# Terminal 6 — API Gateway (start last)
cd backend/api-gateway
mvn spring-boot:run
```

### 4. Start React frontend

```bash
cd frontend
npm install
npm start
# Opens http://localhost:3000
```

---

## 🔌 API Reference

### Auth

```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "emeka@example.com",
  "phone": "+2348012345678",
  "password": "password123",
  "firstName": "Emeka",
  "lastName": "Obi",
  "role": "BUYER"
}
```

```http
POST /api/v1/auth/login
{
  "emailOrPhone": "emeka@example.com",
  "password": "password123"
}
```

### Properties

```http
GET  /api/v1/properties/search?listingType=FOR_RENT&stateId=25&bedrooms=3&page=0&size=12
GET  /api/v1/properties/featured
GET  /api/v1/properties/{id}
POST /api/v1/properties           (requires JWT)
PUT  /api/v1/properties/{id}      (requires JWT + owner)
DEL  /api/v1/properties/{id}      (requires JWT + owner)
```

### File Upload

```http
POST /api/v1/files/upload/property/{propertyId}
Content-Type: multipart/form-data
Authorization: Bearer {token}

file: <image file>
category: images
```

### Transactions (Paystack)

```http
POST /api/v1/transactions/initiate        # Returns Paystack checkout URL
GET  /api/v1/transactions/verify/{ref}    # Verify after payment
GET  /api/v1/transactions/my              # My transaction history
POST /api/v1/transactions/webhook/paystack # Paystack server webhook
```

---

## 🗄️ Database Schema

```
users
  └── properties (ownerId → users.id)
        └── property_files (propertyId → properties.id)

transactions
  ├── buyerId  → users.id
  ├── sellerId → users.id
  └── propertyId → properties.id

notifications → users.id
enquiries
  ├── propertyId → properties.id
  └── senderId → users.id

saved_properties (user_id, property_id) — composite PK

state
  └── lgas (stateId → states.id)
```

---

## 📁 Project Structure

```
corecity/
├── docker-compose.yml
├── .env.example
├── database/
│   └── init.sql                    ← Full schema + 37 Nigerian states seeded
├── backend/
│   ├── pom.xml                     ← Parent Maven POM
│   ├── api-gateway/                ← Spring Cloud Gateway + JWT filter
│   │   └── src/main/java/com/corecity/
│   │       └── filter/AuthFilter.java
│   ├── user-service/               ← Auth, JWT, BVN/NIN support
│   │   └── src/main/java/com/corecity/user/
│   │       ├── entity/User.java
│   │       ├── service/AuthService.java
│   │       └── controller/AuthController.java
│   ├── property-service/           ← Listings, search, filters
│   │   └── src/main/java/com/corecity/property/
│   │       ├── entity/Property.java
│   │       ├── repository/PropertyRepository.java
│   │       ├── service/PropertyService.java
│   │       └── controller/PropertyController.java
│   ├── file-service/               ← Upload + Thumbnailator image resize
│   │   └── src/main/java/com/corecity/fileservice/
│   │       ├── service/FileStorageService.java
│   │       └── controller/FileController.java
│   ├── transaction-service/        ← Paystack NGN payments
│   │   └── src/main/java/com/corecity/transaction/
│   │       ├── service/PaystackService.java
│   │       ├── service/TransactionService.java
│   │       └── controller/TransactionController.java
│   └── notification-service/       ← Email (Thymeleaf) + Termii SMS
│       └── src/main/java/com/corecity/notification/
│           ├── service/EmailService.java
│           ├── service/TermiiSmsService.java
│           └── listener/NotificationEventListener.java
└── frontend/
    └── src/
        ├── App.jsx                 ← Router + auth guard
        ├── context/AuthContext.jsx ← JWT auth state
        ├── services/api.js         ← Axios + all API calls
        ├── utils/nigeria.js        ← Naira formatter, phone validator
        ├── components/
        │   ├── common/Navbar.jsx
        │   ├── common/Footer.jsx
        │   └── property/
        │       ├── PropertyCard.jsx
        │       └── SearchBar.jsx
        └── pages/
            ├── HomePage.jsx
            ├── PropertiesPage.jsx
            ├── PropertyDetailPage.jsx
            ├── AuthPages.jsx       ← Login + Register
            ├── DashboardPage.jsx
            ├── ListPropertyPage.jsx
            └── PaymentVerifyPage.jsx
```

---

## 💳 Paystack Setup

1. Create a [Paystack account](https://paystack.com)
2. Go to Settings → API Keys
3. Copy your **Secret Key** into `.env` as `PAYSTACK_SECRET_KEY`
4. Add your domain to Paystack's allowed callback URLs:
   - `https://yourdomain.ng/payment/verify`
5. Set up the webhook URL in Paystack dashboard:
   - `https://yourdomain.ng/api/v1/transactions/webhook/paystack`

The service fee is automatically calculated: **1.5% + ₦100** (capped at ₦2,000), matching Paystack's Nigerian rate.

---

## 📱 Termii SMS Setup

1. Register at [termii.com](https://termii.com)
2. Get your API key from the dashboard
3. Register a **Sender ID** — `corecity` (requires approval ~24h)
4. Add to `.env` as `TERMII_API_KEY`

SMS events that are sent:
- Welcome message on registration
- Payment confirmation (buyer + seller)
- New property enquiry (agent/owner)
- Listing approved notification

---

## 🔐 Security Notes

- JWT tokens expire in **24 hours** (configurable)
- Passwords hashed with **BCrypt** (strength 10)
- Paystack webhook should verify **HMAC-SHA512** signature in production
- Add **rate limiting** to auth endpoints before going live
- Enable **SSL/TLS** on all services in production
- Store `.env` secrets in a vault (e.g. AWS Secrets Manager) in production

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Tailwind CSS, React Router v6, React Hook Form, Axios |
| API Gateway | Spring Cloud Gateway 2023 |
| Backend | Spring Boot 3.2, Java 21, Spring Data JPA, Spring AMQP |
| Auth | JWT (jjwt 0.11), BCrypt |
| Database | MySQL 8.0, Hibernate |
| Messaging | RabbitMQ 3 |
| Payments | Paystack (Nigerian) |
| SMS | Termii (Nigerian bulk SMS) |
| Email | Spring Mail + Thymeleaf templates |
| File Processing | Thumbnailator (image resizing) |
| Containerisation | Docker, Docker Compose |

---

## 📞 Support

- Email: support@corecity.com.ng
- WhatsApp: +234 800 corecity
- Developer docs: https://docs.corecity.com.ng
