#!/bin/bash

# Auto deployment script for Next.js application with MySQL

# Set environment variables
echo "Setting up environment variables..."
cat > .env.local << EOL
DATABASE_URL="mysql://root:password@localhost:3306/nextn"
NEXTAUTH_SECRET="supersecretstring"
NEXTAUTH_URL="http://localhost:3005"
EOL

# Check if MySQL is installed
if ! command -v mysql &> /dev/null; then
    echo "MySQL is not installed. Please install MySQL first."
    exit 1
fi

# Create database if it doesn't exist
echo "Creating database if it doesn't exist..."
mysql -u root -ppassword -e "CREATE DATABASE IF NOT EXISTS nextn;"

# Install dependencies
echo "Installing dependencies..."
npm install

# Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate

# Apply migrations to database
echo "Applying database migrations..."
npx prisma migrate dev --name init

# Seed the database
echo "Seeding database..."
npm run db:seed

# Build application
echo "Building application..."
npm run build

# Start the application
echo "Starting application..."
npm start

echo "Deployment completed!" 