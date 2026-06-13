import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { spawn, type ChildProcess } from 'child_process';
import path from 'path';

// Plugin that builds and starts the NestJS backend alongside Vite
function nestBackendPlugin() {
  let backendProcess: ChildProcess | null = null;
  const rootDir = path.resolve(__dirname, '..');

  function startBackend() {
    if (backendProcess) return;
    console.log('[backend] Building NestJS...');
    const build = spawn('npx', ['nest', 'build'], {
      cwd: rootDir,
      stdio: 'inherit',
      shell: true,
    });
    build.on('close', code => {
      if (code !== 0) {
        console.error('[backend] NestJS build failed with code', code);
        return;
      }
      console.log('[backend] Starting NestJS on :2785...');
      backendProcess = spawn('node', ['dist/main.js'], {
        cwd: rootDir,
        stdio: 'inherit',
        env: { ...process.env, PORT: '2785' },
        shell: false,
      });
      backendProcess.on('close', () => {
        backendProcess = null;
      });
    });
  }

  return {
    name: 'nest-backend',
    configureServer() {
      startBackend();
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), nestBackendPlugin()],
  appType: 'spa', // Enable SPA fallback for client-side routing
  define: {
    __APP_VERSION__: JSON.stringify(process.env.APP_VERSION || '0.2.1'),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  server: {
    port: 2886,
    proxy: {
      '/api': {
        target: 'http://localhost:2785',
        changeOrigin: true,
        secure: false,
      },
      '/socket.io': {
        target: 'http://localhost:2785',
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
