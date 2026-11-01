module.exports = {
  apps: [{
    name: 'barbershop',
    script: './server/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '256M',
    env: {
      NODE_ENV: 'production',
      PORT: 3001,
      JWT_SECRET: 'change-this-to-a-random-secret-string'
    }
  }]
};
