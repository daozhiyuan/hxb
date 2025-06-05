module.exports = {
  apps : [{
    name: 'crm-system',
    script: 'npm',
    args: 'run dev',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'development',
      PORT: '3000'
    }
  }]
}; 