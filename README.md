# Bitespeed Identity Service

This service identifies and consolidates customer contacts across multiple purchases for FluxKart.com.

## Tech Stack
- Node.js (TypeScript)
- Express.js
- PostgreSQL
- Prisma ORM

## Setup Instructions

### 1. Clone & Install Dependencies
```sh
npm install
```

### 2. Database Setup
- Ensure PostgreSQL is running locally.
- Create a database and user (optional):
  ```sh
  sudo -u postgres psql
  CREATE DATABASE bitespeed;
  CREATE USER bitespeed_user WITH PASSWORD 'yourpassword';
  GRANT ALL PRIVILEGES ON DATABASE bitespeed TO bitespeed_user;
  \q
  ```
- Copy `.env.example` to `.env` and update credentials if needed:
  ```sh
  cp .env.example .env
  # Edit .env as needed
  ```

### 3. Run Prisma Migrations
```sh
npx prisma migrate dev --name init
```

### 4. Start the Server
```sh
npm run dev
```

Server runs on `http://localhost:3000` by default.

## API Usage

### POST `/identify`
**Body:**
```
{
  "email"?: string,
  "phoneNumber"?: string
}
```
**Response:**
```
{
  "contact": {
    "primaryContatctId": number,
    "emails": string[],
    "phoneNumbers": string[],
    "secondaryContactIds": number[]
  }
}
```

## Example Request
```
curl -X POST http://localhost:3000/identify \
  -H 'Content-Type: application/json' \
  -d '{"email": "mcfly@hillvalley.edu", "phoneNumber": "123456"}'
``` 