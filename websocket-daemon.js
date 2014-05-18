var express = require('express')
var app = express()
var http = require('http')
var server = http.createServer(app)
var io = require('socket.io').listen(server)

var pg = require('pg')
var dbConfig = require('./config.json')

server.listen(3000)
console.log('ukhas.net websocket v0.3 running...')

// /socket.io
io.disable('browser client'); // Don't serve js file (www/static/ does this)
io.set('log level', 1); // reduce logging
io.set('transports', [
    'websocket'
  , 'htmlfile'
  , 'xhr-polling'
  , 'jsonp-polling'
]);

// Websocket connection used for the logtail web page
var logtailRoom = io.of('/logtail').on('connection', function (socket) {
    pg.connect(dbConfig, function(err, client, done) {
        if(err) {
            res.send(500,'Database Connection Error')
            console.log('DB Connection Error: ', err)
            return
        }
        client.query('SELECT upload.id AS i,upload.nodeid as ni,nodes.name as nn,upload.time as t,upload.packet as p,upload.state as s,upload.rssi as r FROM ukhasnet.upload INNER JOIN ukhasnet.nodes ON nodes.id=upload.nodeid ORDER BY upload.time DESC LIMIT 200;', function(err, result) {
            done()
            if(err) {
                res.send(500,'Database Query Error')
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
        logtailRoom.emit("upload_row",msg.payload)
    });
    var query = client.query("LISTEN upload_row");
});
pg.connect(dbConfig, function(err, client) {
    if(err) {
        console.log('DB Connection Error: ',err);
    }
    client.on('notification', function(msg) {
        logtailRoom.emit("upload_parse",msg.payload)
    });
    var query = client.query("LISTEN upload_parse");
});
