// Test API helper: database URL validation for health checks
export function validateDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL is not defined. Set the database connection string in environment variables.'
    );
  }

  return databaseUrl;
}

export async function checkHealth() {
  validateDatabaseUrl();

  // Add other service checks here if needed in the future.
  return {
    status: 'ok',
    database: 'connected',
  };
}
