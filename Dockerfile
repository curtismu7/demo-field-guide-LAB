# Demo field guide LAB — static JSON-driven handoff page. Node 20+, zero deps.
FROM node:26-alpine
WORKDIR /app
COPY package.json ./
COPY server ./server
COPY scripts ./scripts
COPY web ./web
COPY data ./data
COPY test ./test
RUN node scripts/build.mjs
ENV PORT=7590 BIND=0.0.0.0 MODE=mock
EXPOSE 7590
CMD ["node", "server/index.js"]
