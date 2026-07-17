# SCPcalc — portable Splunk capacity calculator (CLI + embedded Web UI)
# Published to GitHub Container Registry: ghcr.io/mohammad-mirasadollahi/scpcalc
#
# Local:
#   docker build -t scpcalc --build-arg VERSION=$(tr -d '[:space:]' < VERSION) .
#   docker run --rm -p 12345:12345 scpcalc
#
# Package:
#   docker pull ghcr.io/mohammad-mirasadollahi/scpcalc:latest

# syntax=docker/dockerfile:1

FROM golang:1.22-bookworm AS build
ARG VERSION=dev
WORKDIR /src
COPY go.mod ./
COPY . .
RUN chmod +x scripts/build_wasm.sh scripts/assemble_html.py \
  && python3 scripts/assemble_html.py \
  && GO=go VERSION="${VERSION}" bash scripts/build_wasm.sh \
  && CGO_ENABLED=0 go build -trimpath -ldflags "-s -w -X main.version=${VERSION}" -o /out/scpcalc .

FROM gcr.io/distroless/static-debian12:nonroot
ARG VERSION=dev
LABEL org.opencontainers.image.title="SCPcalc" \
      org.opencontainers.image.description="Portable Splunk Capacity Planning calculator (CLI + Web UI)" \
      org.opencontainers.image.source="https://github.com/Mohammad-Mirasadollahi/splunk-capacity-planning" \
      org.opencontainers.image.vendor="Mohammad Mirasadollahi" \
      org.opencontainers.image.licenses="MIT" \
      org.opencontainers.image.version="${VERSION}"
COPY --from=build /out/scpcalc /scpcalc
EXPOSE 12345
USER nonroot:nonroot
ENTRYPOINT ["/scpcalc"]
CMD ["serve", "--host", "0.0.0.0", "--port", "12345"]
