FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* /app/
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

COPY . /app
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/package.json /app/package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci --only=production; else npm install --only=production; fi

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.js ./

EXPOSE 3000

CMD ["npm", "run", "start", "--", "--hostname", "0.0.0.0", "--port", "3000"]

