# Bitespeed Identity Reconciliation

A backend service that identifies and links a customer's multiple orders placed with different contact details (email / phone number) into a single unified profile.

Live API: `https://bitespeed-production-de71.up.railway.app/identify`

---

## The Problem

A customer might place multiple orders using different emails or phone numbers. The challenge is to recognise that these orders belong to the same person and consolidate their contact information.

---

## How I Thought About It

The core idea is simple: every contact is either a **primary** (the oldest/root record) or a **secondary** (linked to a primary). When a new request comes in, I need to:

1. Check if the email or phone already exists in the database
2. If not —> create a fresh primary contact
3. If yes —> find which cluster(s) it belongs to
4. If the request links two previously separate clusters then, merge them, keeping the older one as primary
5. If the request brings new information (e.g. a new email on a known phone) —> add a secondary contact
6. Always return the full consolidated picture: primary ID, all emails, all phones, all secondary IDs

The trickiest part was the merge case, when one request touches two different primary clusters and forces them to become one.

---

## Tech Stack

- **Language:** TypeScript
- **Framework:** Express.js
- **Database:** MySQL
- **ORM:** TypeORM
- **Deployed on:** Railway

---

## Project Structure

```
src/
├── entity/Contact.ts          # Database model
├── service/IdentityService.ts # All reconciliation logic
├── controller/IdentifyController.ts  # HTTP layer
├── routes.ts                  # Route definitions
└── index.ts                   # App entry point
ormconfig.ts                   # Database connection
```

---

## API

### `POST /identify`

**Request body:**
```json
{
  "email": "krishn@gmail.com",
  "phoneNumber": "1234567890"
}
```

**Response:**
```json
{
  "contact": {
    "primaryContatctId": 1,
    "emails": ["krishn@gmail.com"],
    "phoneNumbers": ["1234567890"],
    "secondaryContactIds": []
  }
}
```

---

## Running Locally

**1. Clone the repo and install dependencies:**
```bash
git clone https://github.com/KRISHN-git/bitespeed
cd bitespeed
npm install
```

**2. Create a `.env` file:**
```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASS=your_password
DB_NAME=bitespeed
```

**3. Create the database:**
```sql
CREATE DATABASE bitespeed;
```

**4. Start the server:**
```bash
npm run dev
```

Server runs at `http://localhost:3000`

---

## Key Logic (IdentityService.ts)

- Contacts matching by email OR phone are fetched
- Each match is traced back to its root primary
- If multiple primaries are found, the oldest one wins and the rest become secondary
- New information in the request creates a new secondary contact
- Response is built with the primary's data first, followed by secondaries, with duplicates removed
