FROM node:22-bookworm-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --chown=node:node server ./server
COPY --chown=node:node src ./src
USER node
ENV NODE_ENV=production ERP_HOST=0.0.0.0 ERP_SERVE_WEB=false ERP_FILE_BACKUPS=false ERP_SECURE_COOKIES=true
CMD ["npm", "start"]
