#!/usr/bin/env bash

#этот я запускаю со своего компа с хоста (не из под докера)
#он сам запустит докер, выполнит экспорт в таблицу и потом
#раскидает эти данные в тидидовскую и назаровскую базы.

cd ../docker/
docker-compose run --rm musiclocator2 node exporter

cd ../export/

ssh nazar "bash -s" < nazar.sh
ssh tidido "bash -s" < tidido.sh