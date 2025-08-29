// module.exports = {
//     apps: [{
//         name: 'api',
//         script: 'dist/server.js',
//         instances: 'max',
//         exec_mode: 'cluster',
//         env: {
//             NODE_ENV: 'development'
//         },
//         env_production: {
//             NODE_ENV: 'production'
//         },
//         error_file: './logs/err.log',
//         out_file: './logs/out.log',
//         log_file: './logs/combined.log',
//         time: true,
//         max_memory_restart: '1G'
//     }]
// };

module.exports = {
  apps: [{
    name: 'api',
    script: 'dist/server.js',
    instances: 'max',
    exec_mode: 'cluster',

    // Environnements
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    // env_production: {
    //   NODE_ENV: 'production',
    //   PORT: 3000
    // },

    // Configuration des logs
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,

    // Gestion mémoire et redémarrage
    max_memory_restart: '1G',
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',

    // Autres options utiles
    watch: false,
    ignore_watch: ['node_modules', 'logs'],

    // Variables d'environnement pour les logs dans votre app
    env_production: {
      NODE_ENV: 'production',
      PORT: 4891,
      LOG_LEVEL: 'info',
      LOG_FILE: './logs/app.log'
    },
    env_development: {
      NODE_ENV: 'development',
      PORT: 3000,
      LOG_LEVEL: 'debug'
    }
  }]
};

module.exports = {
  apps: [{
    name: 'api',
    script: 'dist/server.js',
    instances: 'max',
    exec_mode: 'cluster',

    // Environnements
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    // env_production: {
    //   NODE_ENV: 'production',
    //   PORT: 4891
    // },

    // Configuration des logs
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,

    // Gestion mémoire et redémarrage
    max_memory_restart: '1G',
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',

    // Autres options utiles
    watch: false,
    ignore_watch: ['node_modules', 'logs'],

    // Variables d'environnement pour les logs dans votre app
    env_production: {
      NODE_ENV: 'production',
      PORT: 4891,
      LOG_LEVEL: 'info',
      LOG_FILE: './logs/app.log'
    },
    env_development: {
      NODE_ENV: 'development',
      PORT: 3000,
      LOG_LEVEL: 'debug'
    }
  }]
};