#!/usr/bin/env bash

mongorestore -d tidido -c vk.altsrc --drop /tmp/vk10/export.bson

mongo tidido --eval "db.vk.altsrc.find().forEach(function(d){ db.songs.update({_id: d._id}, {\$set: {altsrc: d.altsrc}}); })"

mongo tidido --eval "db.vk.altsrc.drop()"

rm -r /tmp/vk10/