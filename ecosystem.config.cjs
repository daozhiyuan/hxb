module.exports = {
  apps : [{
    name: 'crm-system',
    script: '.next/standalone/server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      NEXTAUTH_URL: 'http://localhost:3005',
      NEXT_PUBLIC_APP_URL: 'http://localhost:3005',
      PORT: 3005
    }
  }]
}; 