#!/bin/bash

# Script to initialize the MySQL database for development

# Set database credentials
DB_USER="root"
DB_PASSWORD="password"
DB_NAME="nextn"

# Check if MySQL is installed
if ! command -v mysql &> /dev/null; then
    echo "MySQL is not installed. Please install MySQL first."
    exit 1
fi

# Create database if it doesn't exist
echo "Creating database if it doesn't exist..."
mysql -u $DB_USER -p$DB_PASSWORD -e "CREATE DATABASE IF NOT EXISTS $DB_NAME;"

# Apply database migrations
echo "Applying database migrations..."
npx prisma migrate dev --name init

# Seed the database with initial data
echo "Seeding the database..."
npm run db:seed

echo "Database initialization completed successfully!" 