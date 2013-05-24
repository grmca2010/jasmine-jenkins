'use strict';

var http = require('http')
    , fs = require('fs')
    , path = require('path')
    , url = require('url')
    , qs = require('querystring')
    , tmpl = require('./template')
    , view = require('./view')
    , util = require('./util');

// SERVER
var server = {};

server.setup = function(cfg){
    server.PORT = cfg.port || 3000;
    server.SRC_DIR = path.resolve(__dirname, (cfg.src || 'src'));
    server.TESTS_DIR = cfg.tests;
    server.SOURCE_DIR = cfg.sources;
    server.BASEURL = cfg.baseUrl;
    return this;
};

server.$ = null;
server.start = function(){
    server.$ = http.createServer(server.router).listen(server.PORT);
    return this;
};

server.end = function(){
    console.log(':::::: SHUTDOWN SERVER');
    process.exit();
};

server.getFilePath = function(pathname){
    return path.join(__dirname, pathname.replace(server.BASEURL, ''));
};

server.makeScriptsTemplate = function(callback) {
    var testsDir = path.join(__dirname, server.TESTS_DIR)
        , tests = [];

    util.findAllFiles('.js', testsDir, function(err, files){
        util.sortFiles(files);
        files.forEach(function(file){
            file = file.replace(testsDir, '').replace(path.sep, '').replace(/\\/gi, '/'); // ugh;
            tests.push('<script type="text/javascript" src="src/specs/'+file+'"></script>');
        });
        callback(tests.join());
    });

}

// ACTIONS 
server.home = function(req, res){
    server.makeScriptsTemplate(function(tests){
        console.log(tests);
        var html = view.render(tmpl.get('home'), {tests: tests});

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(html);
    });
};

server.src = function(req, res){
    var fileName = server.getFilePath(req.url.pathname),
        fileExt = path.extname(fileName),
        fileStream = fs.createReadStream(fileName);

    fileStream.on('open', function () {
        res.writeHead(200, { 'Content-Type': server.getMimeType(fileExt) });
        fileStream.pipe(res);
    });

    fileStream.on('error', function(err){
        console.log(':::::: FAILED TO SERVE ' + req.url.href);

        if (err.code === 'ENOENT'){
            console.log(':::::: COULD NOT FIND: ' + fileName);
            return server.notFound(req, res);
        }

        fileStream.destroy();
        return server.error500(req, res, err);
    });
};

server.exit = function(req, res){
    res.writeHead(200);
    res.end('goodbye!');
    server.end();
};

server.notFound = function(req, res){
    res.writeHead(404);
    res.end('file not found ' + req.url.href);
};

server.error500 = function(req, res, err){
    console.log(':::::: SOUR TIMES');
    console.dir(err);
    res.writeHead(500);
    res.end('aw poop ' + req.url.href);
};


// MIME TYPES
server.mimeTypes = {
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.jpg': 'image/jpeg',
    '.html': 'text/html',
    unknown: 'text/html'
};

server.getMimeType = function(fileExt){
    return server.mimeTypes[fileExt] || server.mimeTypes.unknown;
};


// ROUTING 
server.routes = {};

server.registerRoute = function(route, callback){
    server.routes[route] = callback;
    return this;
};

server.router = function(req, res){
    var action;

    req.url = url.parse(req.url);
    req.url.params = qs.parse(req.url.query);
    req.url.root = (req.url.pathname.match(/^\/\w*/gi) || [])[0];
    action = server.routes[req.url.root] || server.routes.unknown;

    action(req, res);
};

module.exports = server;
