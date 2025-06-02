#!/bin/bash
set -e # Exit immediately if a command exits with a non-zero status.

# Ensure DATABASE_URL is set
: "${DATABASE_URL:?Need to set DATABASE_URL}"

echo "Waiting for PostgreSQL to be ready..."
# Simple wait loop (consider a more robust wait-for-it script in a real scenario)
# The -X flag prevents reading any psqlrc file, --quiet supresses messages
until psql "$DATABASE_URL" -X --quiet -c '\q'; do
  >&2 echo "Postgres is unavailable - sleeping"
  sleep 1
done

>&2 echo "Postgres is up - executing command"

echo "Applying migrations from init.sql..."
# -v ON_ERROR_STOP=1 ensures the script stops if an error occurs in the SQL file
# -f specifies the SQL file to execute
# "$(dirname "$0")" refers to the directory where the script is located
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$(dirname "$0")/init.sql"

echo "Migrations applied successfully."
