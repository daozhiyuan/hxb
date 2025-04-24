#!/bin/sh

# Wait for the database to be ready
echo "Waiting for database connection..."
npx wait-on -t 60000 tcp:db:3306

# Apply database migrations
echo "Applying database migrations..."
npx prisma migrate deploy

# Run the application
echo "Starting Next.js application..."
exec node server.js 