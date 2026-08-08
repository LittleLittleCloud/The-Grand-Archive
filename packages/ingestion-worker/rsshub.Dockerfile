# Thin wrapper around the upstream RSSHub image. The public image does not
# declare an EXPOSE instruction, which Cloudflare Containers local dev requires
# in order to connect to the container's port. RSSHub listens on 1200.
# See https://developers.cloudflare.com/containers/local-dev/#exposing-ports
FROM docker.io/diygod/rsshub:chromium-bundled-2026-07-24
EXPOSE 1200
