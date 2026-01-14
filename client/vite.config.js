import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    server: {
        proxy: {
            '/api': {
                target: 'http://localhost:3001',
                changeOrigin: true,
            },
        },
    },
    define: {
        // 如果环境变量未定义，使其为空字符串，避免构建错误
        'import.meta.env.VITE_API_URL': JSON.stringify(process.env.VITE_API_URL || '')
    }
})
