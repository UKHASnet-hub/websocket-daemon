#!/usr/bin/env node

var express = require('express')
var app = express()
var http = require('http')
var server = http.createServer(app)
var io = require('socket.io').listen(server)

var pg = require('pg')
var dbConfig = require('./config.json')

server.listen(3000)
console.log('ukhas.net websocket v0.3 running...')

var logtail_namespace = io.of('/logtail');

// Websocket connection used for the logtail web page
logtail_namespace.on('connection', function (socket) {
    pg.connect(dbConfig, function(err, client, done) {
        if(err) {
            console.log('DB Connection Error: ', err)
            return
        }
        client.query('SELECT upload.id AS i,upload.nodeid as ni,nodes.name as nn,upload.time as t,upload.packet as p,upload.state as s,upload.rssi as r FROM ukhasnet.upload INNER JOIN ukhasnet.nodes ON nodes.id=upload.nodeid ORDER BY upload.time DESC LIMIT 200;', function(err, result) {
            done()
            if(err) {
                console.log('DB Query Error: ', err)
                return
            }
            socket.emit("logtail_l200", JSON.stringify(result.rows));
        });
    });
});

// Postgres Notifications
pg.connect(dbConfig, function(err, client) {
    if(err) {
        console.log('DB Connection Error: ',err);
    }
    client.on('notification', function(msg) {
        switch(msg.channel) {
            case "upload_row":
                logtail_namespace.emit("upload_row",msg.payload)
                break;
            case "upload_parse":
                logtail_namespace.emit("upload_parse",msg.payload)
                break;
        }
    });
    client.query("LISTEN upload_row");
    client.query("LISTEN upload_parse");
});
