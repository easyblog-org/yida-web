import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    // Please make sure that '@tanstack/router-plugin' is passed before '@vitejs/plugin-react'
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
    }),
    react({
      babel: {
        // 仅对项目源码启用 React Compiler，排除 node_modules。
        // 第三方库（antd、@ant-design/x-markdown 等）已被其作者优化，
        // React Compiler v1.0 对第三方库的自动 memoization 可能破坏内部状态管理逻辑，
        // 导致 Maximum update depth exceeded 无限循环。
        include: [/src/],
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  optimizeDeps: {
    exclude: ['fsevents'],
  },
  server: {
    // 开发环境通过 vite 服务器代理来处理跨域
    proxy: {
      '/api': {
        target: 'http://localhost:9000',
        changeOrigin: true,
        secure: false,
        ws: true,
        rewrite: (path: string) => path.replace(/^\/api/, '/yida'),
      },
      '/d': {
        target: 'http://localhost:9000',
        changeOrigin: true,
        secure: false,
      },
      '/cdn-proxy': {
        target: 'http://tfuvj8a9x.hn-bkt.clouddn.com',
        changeOrigin: true,
        secure: false,
        rewrite: (path: string) => path.replace(/^\/cdn-proxy/, ''),
      },
    },
  },
})
