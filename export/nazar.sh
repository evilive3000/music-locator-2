#!/usr/bin/env bash

# дампим таблицу
mongodump -d vk10 -c export -o /tmp/

# отправляем таблицу на tidido.com
rsync -avzhR --progress /tmp/vk10/ tidido:/

# восстанавливаем её во временную коллекцию vk.altsrc
mongorestore -d tidido -c vk.altsrc --drop /tmp/vk10/export.bson

# обновляем песни, добавляем поле altsrc
mongo tidido --eval "db.vk.altsrc.find().forEach(function(d){ db.songs.update({_id: d._id}, {\$set: {altsrc: d.altsrc}}); })"

# убиваем временную коллекцию
mongo tidido --eval "db.vk.altsrc.drop()"

# чистим папку
rm -r /tmp/vk10/