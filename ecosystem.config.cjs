module.exports = {
  apps: [
    {
      name: "warehousecontrol",
      cwd: "/var/www/warehousecontrol",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      env: {
        NODE_ENV: "production",
        PORT: "3000",
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: "512M",
    },
  ],
};
