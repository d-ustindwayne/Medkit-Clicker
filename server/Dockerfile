# Medkit Clicker API. Build from the repo root: docker build -f server/Dockerfile -t medkit-api .
FROM oven/bun:1.3-alpine
WORKDIR /app
COPY server/index.ts ./index.ts
ENV PORT=8787
EXPOSE 8787
CMD ["bun", "index.ts"]
