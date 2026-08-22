module.exports = {
  apps: [
    // =========================
    // MASTER API
    // =========================
    {
      name: 'api-master',
      cwd: './packages/api',
      script: 'dist/master/server.js',
      instances: 1,
      exec_mode: 'fork',

      env_production: {
        NODE_ENV: 'production',
        PORT: 4891,
        API_TYPE: 'master',
      },

      error_file: './logs/master-pm2-err.log',
      out_file: './logs/master-pm2-out.log',
      autorestart: true,
      max_memory_restart: '512M',
      restart_delay: 5000,
      min_uptime: '10s',
      max_restarts: 5,
    },

    // =========================
    // TENANT API
    // =========================
    {
      name: 'api-tenant',
      cwd: './packages/api',
      script: 'dist/tenant/server.js',
      instances: 1,
      exec_mode: 'fork',

      env_production: {
        NODE_ENV: 'production',
        PORT: 4892,
        API_TYPE: 'tenant',
        PLANNING_ORTOOLS_URL: 'http://127.0.0.1:8090',
      },

      error_file: './logs/tenant-pm2-err.log',
      out_file: './logs/tenant-pm2-out.log',
      autorestart: true,
      // max_memory_restart: '512M',
      max_memory_restart: '768M',
      restart_delay: 5000,
      min_uptime: '10s',
      max_restarts: 5,
    },

    // =========================
    // BACKEND
    // =========================
    {
      name: 'api-backend',
      cwd: './packages/backend',
      script: 'dist/server.js',

      node_args: '--max-old-space-size=512',

      instances: 1,
      exec_mode: 'fork',

      env_production: {
        NODE_ENV: 'production',
        PORT: 4893,
      },

      error_file: './logs/backend-pm2-err.log',
      out_file: './logs/backend-pm2-out.log',

      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      time: true,

      autorestart: true,

      max_memory_restart: '512M',

      restart_delay: 5000,
      exp_backoff_restart_delay: 100,

      kill_timeout: 5000,

      min_uptime: '10s',
      max_restarts: 5,
    },

    // =========================
    // ROTATION CRON
    // =========================
    {
      name: 'toke-rotation',
      cwd: './packages/api',
      script: 'dist/automate/automate.js',
      instances: 1,
      exec_mode: 'fork',

      env_production: {
        NODE_ENV: 'production',
        TZ: 'Africa/Douala',
      },

      error_file: './logs/rotation-pm2-err.log',
      out_file: './logs/rotation-pm2-out.log',
      autorestart: true,
      max_memory_restart: '256M', // léger, pas de trafic HTTP
      restart_delay: 10000,
      min_uptime: '10s',
      max_restarts: 3, // moins tolérant : si ça crash 3x, c'est un bug à corriger
    },

    // =========================
    // OR-TOOLS PLANNING SOLVER
    // =========================
    {
      name: 'toke-planning-ortools',
      cwd: './packages/planning-ortools',

      script: '.venv/bin/python',

      args: ['-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '8090'],

      interpreter: 'none',

      instances: 1,
      exec_mode: 'fork',

      env_production: {
        PYTHONUNBUFFERED: '1',
        TZ: 'Africa/Douala',
      },

      error_file: './logs/ortools-pm2-err.log',
      out_file: './logs/ortools-pm2-out.log',

      autorestart: true,
      // max_memory_restart: '768M',
      max_memory_restart: '1536M',
      restart_delay: 5000,
      kill_timeout: 10000,
      min_uptime: '10s',
      max_restarts: 5,
    },
  ],
};
