#!make

DOCKER_IMAGE_NAME:=autolabel-dev
ROOT_DIR:=$(CURDIR)/

build:
	docker build -f Dockerfile-develop --tag $(DOCKER_IMAGE_NAME) $(ROOT_DIR)

develop:
	@docker run --rm=true -it -p 9229:9229 -v "$(ROOT_DIR)":/home/autolabel $(DOCKER_IMAGE_NAME) bash
