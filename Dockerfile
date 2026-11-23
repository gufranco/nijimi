FROM mcr.microsoft.com/playwright:v1.65.1-resolute@sha256:dcf385f7a31aa1cbb0a7a0c97a539142bf70480b661f89f26a774ec1fe2edd1d

ARG TARGETARCH
ARG PNPM_VERSION=12.21.0
ARG PNPM_SHA256_AMD64=84c4773bcf4a217f4083cd7b2a91e4cee6103cf42426c1282ef37d308f55a410
ARG PNPM_SHA256_ARM64=6c5913a48c93b3a556b71c3bd9bf12c6bf9fbfbbbd2dcbd1d52a85c539751b9e

SHELL ["/bin/bash", "-o", "pipefail", "-c"]

RUN case "${TARGETARCH}" in \
      amd64) arch=x64; sum="${PNPM_SHA256_AMD64}" ;; \
      arm64) arch=arm64; sum="${PNPM_SHA256_ARM64}" ;; \
      *) echo "unsupported architecture ${TARGETARCH}" >&2; exit 1 ;; \
    esac \
 && curl -fsSL -o /tmp/pnpm.tar.gz \
      "https://github.com/pnpm/pnpm/releases/download/v${PNPM_VERSION}/pnpm-linux-${arch}.tar.gz" \
 && echo "${sum}  /tmp/pnpm.tar.gz" | sha256sum --check --strict \
 && mkdir -p /opt/pnpm \
 && tar -xzf /tmp/pnpm.tar.gz -C /opt/pnpm \
 && rm /tmp/pnpm.tar.gz \
 && ln -s "$(find /opt/pnpm -type f -name pnpm -perm -u+x | head -n 1)" /usr/local/bin/pnpm \
 && pnpm --version

RUN apt-get update \
 && apt-get install --yes --no-install-recommends make shellcheck yamllint \
 && rm -rf /var/lib/apt/lists/*

ENV CI=true

RUN mkdir -p /app/node_modules \
 && chown -R 1001:1001 /app

USER 1001:1001

WORKDIR /app
