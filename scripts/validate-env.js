const requiredEnvVars = [
  'PROJECT_URL',
  'GCP_PROJECT_ID',
  'REDIS_URL',
  'AT_PROTOCOL_HEALTH_USER',
  'SESSION_TIMEOUT'
];

function validateEnv() {
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(varName => {
      console.error(`   - ${varName}`);
    });
    process.exit(1);
  }
  
  console.log('✅ All required environment variables are present');
}

validateEnv(); 