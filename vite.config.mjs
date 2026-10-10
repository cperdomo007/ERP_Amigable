import {defineConfig} from 'vite';
export default defineConfig({server:{proxy:{'/api/erp':{target:'http://127.0.0.1:3002',changeOrigin:false}}}});
