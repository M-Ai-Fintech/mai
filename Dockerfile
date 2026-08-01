ARG DENO_VERSION=2.9.3
FROM denoland/deno:${DENO_VERSION}

WORKDIR /app

COPY deno.json ./deno.json
COPY src ./src
COPY scripts ./scripts
COPY infra ./infra

RUN deno cache --allow-read --allow-env --allow-net src/api/server.ts \
  src/platform/jobs/worker_process.ts

ENV DENO_NO_UPDATE_CHECK=1
EXPOSE 8000

ENTRYPOINT ["deno"]
CMD ["task", "api:start"]
