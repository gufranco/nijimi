IMAGE := nijimi-dev
ACTIONLINT_IMAGE := rhysd/actionlint:1.7.12@sha256:b1934ee5f1c509618f2508e6eb47ee0d3520686341fec936f3b79331f9315667
DOCKER_RUN := docker run --rm --init --ipc=host --ulimit core=0 \
	-v "$(CURDIR)":/app \
	-v nijimi-node-modules:/app/node_modules \
	-w /app
RUN := $(DOCKER_RUN) $(IMAGE)
RUN_TTY := $(DOCKER_RUN) -it -p 5173:5173 $(IMAGE)

.PHONY: image install dev format format-check lint lint-ci typecheck test e2e build ci clean

image:
	docker build --tag $(IMAGE) .

install: image
	$(RUN) pnpm install --frozen-lockfile

dev: install
	$(RUN_TTY) pnpm dev

format: install
	$(RUN) pnpm format

format-check: install
	$(RUN) pnpm format:check

lint: install
	$(RUN) pnpm lint

lint-ci:
	docker run --rm -v "$(CURDIR)":/repo -w /repo $(ACTIONLINT_IMAGE) -color
	$(RUN) yamllint --strict .

typecheck: install
	$(RUN) pnpm typecheck

test: install
	$(RUN) pnpm test
	$(RUN) pnpm test:engines

build: install
	$(RUN) pnpm build

e2e: build
	$(RUN) pnpm e2e

ci: format-check lint lint-ci typecheck test e2e

clean:
	docker volume rm --force nijimi-node-modules
