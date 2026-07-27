module.exports = {
  apps: [
    {
      name: 'toke-planning-ortools',
      cwd: '/opt/toke/packages/planning-ortools',
      script: '.venv/bin/uvicorn',
      args: 'app.main:app --host 127.0.0.1 --port 8090',
      interpreter: 'none',
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      env: {
        PYTHONUNBUFFERED: '1',
      },
    },
  ],
};
