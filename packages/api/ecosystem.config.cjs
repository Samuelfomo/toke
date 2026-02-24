module.exports = {
  apps: [
    {
      name: 'api-master',
      script: 'dist/master/server.js',

      // 🔧 Configuration Master API
      instances: 1,
      exec_mode: 'fork',

      // 📁 Répertoire de travail
      cwd: './',

      // 🌍 Environnement par défaut (development)
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
        LOG_LEVEL: 'debug',
        API_TYPE: 'master',
      },

      // 🚀 Environnement production
      env_production: {
        NODE_ENV: 'production',
        PORT: 4891,
        LOG_LEVEL: 'info',
        LOG_FILE: './logs/master-app.log',
        API_TYPE: 'master',
      },

      // 📋 Configuration des logs PM2
      error_file: './logs/master-pm2-err.log',
      out_file: './logs/master-pm2-out.log',
      log_file: './logs/master-pm2-combined.log',
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      // 🔄 Gestion des redémarrages
      autorestart: true,
      max_restarts: 5,
      min_uptime: '30s',
      max_memory_restart: '512M',

      // ⚡ Optimisations
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'tmp', '*.pid'],

      // 🛡️ Gestion d'erreur
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,

      // 📊 Monitoring
      pmx: false,

      // 🔧 Variables spécifiques
      node_args: '--max-old-space-size=512',
    },
    {
      name: 'api-tenant',
      script: 'dist/tenant/server.js',

      // 🔧 Configuration Tenant API
      instances: 1,
      exec_mode: 'fork',

      // 📁 Répertoire de travail
      cwd: './',

      // 🌍 Environnement par défaut (development)
      env: {
        NODE_ENV: 'development',
        PORT: 3001,
        LOG_LEVEL: 'debug',
        API_TYPE: 'tenant',
      },

      // 🚀 Environnement production
      env_production: {
        NODE_ENV: 'production',
        PORT: 4892,
        LOG_LEVEL: 'info',
        LOG_FILE: './logs/tenant-app.log',
        API_TYPE: 'tenant',
      },

      // 📋 Configuration des logs PM2
      error_file: './logs/tenant-pm2-err.log',
      out_file: './logs/tenant-pm2-out.log',
      log_file: './logs/tenant-pm2-combined.log',
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      // 🔄 Gestion des redémarrages
      autorestart: true,
      max_restarts: 5,
      min_uptime: '30s',
      max_memory_restart: '512M',

      // ⚡ Optimisations
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'tmp', '*.pid'],

      // 🛡️ Gestion d'erreur
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,

      // 📊 Monitoring
      pmx: false,

      // 🔧 Variables spécifiques
      node_args: '--max-old-space-size=512',
    },
  ],
};