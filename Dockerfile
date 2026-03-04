FROM oven/bun:1 AS builder
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun build --compile --minify server.ts --outfile intracore

FROM gcr.io/distroless/cc-debian12:nonroot
WORKDIR /app

COPY --from=builder --chown=65532:65532 /app/intracore .

EXPOSE 3000
ENV PORT=3000

CMD ["/app/intracore"]
