# Bitespeed Identity Service

This service identifies and consolidates customer contacts across multiple purchases for FluxKart.com.

## Tech Stack
- Node.js (TypeScript)
- Express.js
- PostgreSQL
- Prisma ORM

## Setup Instructions

### 1. Database Setup
- Ensure PostgreSQL is running locally.
- Create a database:
  ```sh
  sudo -u postgres psql
  CREATE DATABASE bitespeed;
  \q
  ```
- Run create table sql command from file ~/bitespeed/prisma/migrations/20250620090959_init/migration.sql in DB. 
- Copy `.env.example` to `.env` and update credentials if needed:
  ```sh
  cp .env.example .env
  # Edit .env as needed
  ```

### 3. Build Command
```sh
  npm install && npx prisma migrate deploy
```

### 4. Start the Server
```sh
  npm run start
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
