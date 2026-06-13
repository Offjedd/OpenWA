import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { spawn, type ChildProcess } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Plugin that builds (if needed) and starts the NestJS backend alongside Vite
function nestBackendPlugin() {
  let backendProcess: ChildProcess | null = null;
  const rootDir = resolve(__dirname, '..');
  const distMain = resolve(rootDir, 'dist', 'main.js');

  function launchBackend() {
    if (backendProcess) return;
    console.log('[backend] Starting NestJS on :2785...');
    backendProcess = spawn('node', ['dist/main.js'], {
      cwd: rootDir,
      stdio: 'inherit',
      env: { ...process.env, PORT: '2785' },
      shell: false,
    });
    backendProcess.on('close', () => { backendProcess = null; });
  }

  function startBackend() {
    if (existsSync(distMain)) {
      launchBackend();
      return;
    }
    console.log('[backend] Building NestJS (first run)...');
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
      launchBackend();
    });
  }

  return {
    name: 'nest-backend',
    configureServer() {
      startBackend();
    },
  };
}

export default defineConfig({
  plugins: [react(), nestBackendPlugin()],
  appType: 'spa',
  define: {
    __APP_VERSION__: JSON.stringify(process.env.APP_VERSION || '0.2.1'),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  server: {
    port: 5173,
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
