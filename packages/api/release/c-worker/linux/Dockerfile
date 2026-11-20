# Test environment only; no Toké payload, credentials or fixtures in image layers.
FROM node:20.18.0-bookworm-slim AS node
FROM ubuntu:24.04
ENV DEBIAN_FRONTEND=noninteractive
RUN printf '#!/bin/sh\nexit 101\n' > /usr/sbin/policy-rc.d \
 && chmod 0755 /usr/sbin/policy-rc.d \
 && apt-get update \
 && apt-get install -y --no-install-recommends postgresql-16 postgresql-16-postgis-3 ca-certificates libstdc++6 \
 && useradd --create-home --uid 10001 worker-fixture \
 && rm -rf /var/lib/apt/lists/*
COPY --from=node /usr/local/bin/node /usr/local/bin/node
ENV PATH=/usr/local/bin:/usr/lib/postgresql/16/bin:/usr/bin:/bin
ENV LANG=C LC_ALL=C TZ=Africa/Douala
USER 10001:10001
WORKDIR /tmp
ENTRYPOINT ["node"]
