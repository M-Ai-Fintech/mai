FROM denoland/deno:2.9.3@sha256:6288db6be1c26473bb9d1843f906d9a219c0dda57fd85de4aac90296951cf6ef

WORKDIR /app

COPY --chown=deno:deno deno.json deno.lock ./
COPY --chown=deno:deno src ./src
COPY --chown=deno:deno scripts ./scripts
COPY --chown=deno:deno infra ./infra

RUN deno cache --frozen \
  src/api/server.ts \
  src/platform/jobs/worker_process.ts \
  src/platform/jobs/local_worker.ts \
  scripts/migrate.ts

ENV DENO_NO_UPDATE_CHECK=1
ENV DENO_NO_PROMPT=1
USER deno
EXPOSE 8000 8001

ENTRYPOINT ["deno"]
CMD ["task", "api:start"]
