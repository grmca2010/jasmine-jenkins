'use strict';

var http = require('http'),
    fs = require('fs'),
    path = require('path'),
    url = require('url'),
    qs = require('querystring'),
    spawn = require('child_process').spawn,
    os = require('os');

var util = (function(){
    var sortFiles = function(files){
        var sorter = function(a, b){
            a = a.split(path.sep);
            b = b.split(path.sep);

            if (a.length === b.length){
                a = a.join(path.sep);
                b = b.join(path.sep);
                return a.localeCompare(b);
            }
            return a.length - b.length;
        };
        return files.sort(sorter);
    };

    var findAllFiles = function(ext, dir, done) {
        var results = [];

        if (typeof dir === 'function'){
            done = dir;
            dir = ext;
            ext = null;
        }

        fs.readdir(dir, function(err, list) {
            var toProcess;

            if (err) { return done(err, results); }

            toProcess = list.length;

            if (!toProcess) { return done(null, results); }

            list.forEach(function(file) {
                file = path.join(dir, '/', file);

                fs.stat(file, function(err, stat) {
                    if (stat && stat.isDirectory()) {
                        findAllFiles(file, function(err, res) {
                            results = results.concat(res);
                            toProcess -= 1;
                            if (!toProcess) { done(null, results); }
                        });
                    } else {
                        if (path.extname(file) === ext || ext === null ){
                            results.push(file);
                        }
                        toProcess -= 1;
                        if (!toProcess) { done(null, results); }
                    }
                });
            });
        });
    };

    return {
        sortFiles: sortFiles,
        findAllFiles: findAllFiles
    };
}());


// TEMPLATE LOADER ////////////////////////////////////////////////////////////
var tmpl = (function(){
    var t = {};

    t.collection = {};

    t.load = function(name, filePath){
        tmpl.collection[name] = fs.readFileSync(path.resolve(__dirname, filePath), 'utf-8');
        return this;
    };

    t.get = function(name){
        return tmpl.collection[name];
    };

    return t;
}());


// VIEW RENDERER //////////////////////////////////////////////////////////////
var view = (function(){
    var _noop = function( match ){ return match; },
        _filterFn,
        _viewModel;

    var render = function( tmpl, model, filter ){
        var regx = /\{+([a-z]\w[^\}]*)\}+/g;

        _viewModel = model;
        _filterFn = filter || _noop;

        return tmpl.replace( regx, _matchToken );
    };

    var _matchToken = function( match ){
        var numBraces = match.split( '{' ).length - 1,
            filter = numBraces > 2 ? _noop : _filterFn,
            output = _getTokenValue( _viewModel, match.slice( numBraces, - numBraces ).split( '.' ) );

        if ( output == null ){
            return match;
        }
        return filter( output );
    };

    var _getTokenValue = function( model, properties ){
        model = model[ properties.shift() ];
        if ( typeof model === 'object' ){
            return _getTokenValue( model, properties );
        }
        return model;
    };

    return {
        render: render
    };
}());


// CLI ////////////////////////////////////////////////////////////////////////
var config = (function(){
    var flags = {};

    var registerFlag = function(flag, name){
        var args = process.argv.slice(2),
            index, value, next;

        if (name in flags){ return; }

        index = args.indexOf(flag);

        if (index === -1){
            flags[name] = false;
            return this;
        }

        next = args[index + 1];

        if (next && next.charAt(0) !== '-'){
            value = next;
        } else {
            value = true;
        }

        flags[name] = value;
        return this;
    };

    return {
        flags: flags,
        registerFlag: registerFlag
    };
}());


// SERVER /////////////////////////////////////////////////////////////////////
var server = {};

server.setup = function(cfg){
    server.PORT = cfg.port || 3000;
    server.STATICS_DIR = path.resolve(__dirname, (cfg.statics || 'src'));
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

server.runTests = function(){
    console.log(':::::: LAUNCHING PHANTOMJS EXE [ ' + server.getPhantomJSPath() + ' ]');
    console.log(':::::: LAUNCHING PHANTOMJS RUNNER [ ' + server.getTestRunnerPath() + ' ]');
    console.log(':::::: LAUNCHING PHANTOMJS REPORTER [ ' + server.getServerAddress() + ' ]');
    var pjs = spawn(server.getPhantomJSPath(), [server.getTestRunnerPath(), server.getServerAddress()]);
    pjs.on('exit', function (code) {
        console.log(':::::: PHANTOMJS EXITED ' + (code === 0 ? 'OK' : 'FAIL') + ' [ code: ' + code + ' ]');
        server.end();
    });
    pjs.stdout.on('data', function (data) {
        console.log(':::::: PHANTOMJS: ' + data);
    });
};

server.end = function(){
    console.log(':::::: SHUTDOWN SERVER');
    process.exit();
};


// PATHS //////////////////////////////////////////////////////////////////////
server.getTestsDirectory = function(){
    return path.join(server.STATICS_DIR, server.TESTS_DIR);
};

server.getFilePath = function(pathname){
    return path.join(__dirname, pathname.replace(server.BASEURL, ''));
};

server.getPhantomJSPath = function(){
	var isWin = !!os.platform().match(/^win/);
    return path.join(__dirname, '../bin/phantomjs' + (isWin ? '.exe' : ''));
};

server.getTestRunnerPath = function(){
    return path.join(__dirname, './runner.js');
};

server.getServerAddress = function(){
    return 'http://127.0.0.1:' + server.PORT;
};


// ACTIONS ////////////////////////////////////////////////////////////////////
server.home = function(req, res){
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(view.render(tmpl.get('home'), {}));
};

server.statics = function(req, res){
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


// MIME TYPES /////////////////////////////////////////////////////////////////
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


// ROUTING ////////////////////////////////////////////////////////////////////
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


// INIT ///////////////////////////////////////////////////////////////////////
config
    .registerFlag('-t', 'runTests')
    .registerFlag('-h', 'help')
    .registerFlag('-p', 'path');

tmpl
    .load('home', 'reporter.html');

if (config.flags.help){
    console.log(':::::: USAGE ::::::::::::::::::::::::::::::::::');
    console.log('::: -p <path to statics project> (optional) :::');
    console.log('::: -t run tests headless (optional) ::::::::::');
    console.log('::: -h help :::::::::::::::::::::::::::::::::::');
    console.log(':::::::::::::::::::::::::::::::::::::::::::::::');
    process.exit();
}

server
    .setup({
        port: 3000,
        statics: config.flags.path,
        tests: '/tests',
        sources: { dev: '/js/', prod: '/bin/js-built/' },
        baseUrl: '/src'
    })
    .registerRoute('/', server.home)
    .registerRoute('/exit', server.exit)
    .registerRoute(server.BASEURL, server.statics)
    .registerRoute('unknown', server.notFound)
    .start();

console.log(':::::: RUNNING SERVER [ ' + server.getServerAddress() + ' ]');

if (config.flags.runTests){
    server.runTests();
}

module.exports = server;