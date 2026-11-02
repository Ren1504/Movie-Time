FROM node:24-slim

WORKDIR /app
COPY package.json package-lock.json ./
COPY client/package.json client/
COPY server/package.json server/
COPY shared/package.json shared/
RUN npm ci

COPY client client
COPY server server
COPY shared shared
RUN npm run build --workspace client

ENV NODE_ENV=production
EXPOSE 3001
CMD ["npm", "start"]
