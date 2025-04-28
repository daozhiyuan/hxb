# Keyingbao Application

This is a Next.js application using Prisma with MySQL for database management.

## Automatic Deployment

### Option 1: Using the Deploy Script (Local Development)

1. Make sure MySQL is installed on your system.
2. Run the deployment script:

```bash
./deploy.sh
```

This will:
- Set up environment variables
- Create the database if it doesn't exist
- Install dependencies
- Generate Prisma client
- Apply database migrations
- Seed the database
- Build and start the application

### Option 2: Using Docker Compose (Recommended)

1. Make sure Docker and Docker Compose are installed on your system.
2. Run the following command:

```bash
docker-compose up -d
```

This will:
- Start a MySQL container
- Build and start the application
- Apply database migrations
- Connect the application to the database

## Manual Setup

If you prefer to set up manually:

1. Create a `.env.local` file with the following content:

```
DATABASE_URL="mysql://root:password@localhost:3306/nextn"
NEXTAUTH_SECRET="supersecretstring"
NEXTAUTH_URL="http://localhost:3005"
```

2. Initialize the database:

```bash
./init-db.sh
```

3. Install dependencies:

```bash
npm install
```

4. Build the application:

```bash
npm run build
```

5. Start the application:

```bash
npm start
```

## Development Mode

To run the application in development mode:

```bash
npm run dev
```

## Environment Variables

- `DATABASE_URL`: MySQL connection string
- `NEXTAUTH_SECRET`: Secret for NextAuth.js
- `NEXTAUTH_URL`: URL for NextAuth.js

## Database Management

- Generate Prisma client: `npx prisma generate`
- Apply migrations: `npx prisma migrate dev`
- Seed database: `npm run db:seed` 