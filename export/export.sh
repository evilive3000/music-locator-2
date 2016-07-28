#!/usr/bin/env bash

cd ../docker/
docker-compose run --rm musiclocator2 node exporter

cd ../export/

ssh nazar "bash -s" < nazar.sh
ssh tidido "bash -s" < tidido.sh