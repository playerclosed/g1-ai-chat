FROM oven/bun:1-alpine
WORKDIR /app

COPY package.json ./

RUN bun install --frozen-lockfile

COPY . ./

ENTRYPOINT ["bun", "run", "src/index.ts"]
