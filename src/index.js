var cli = require('./cli')
    , tmpl = require('./template')
    , spawn = require('child_process').spawn
    , os = require('os')
    , path = require('path')
    , server = require('./server');

// INIT
cli
    .registerFlag('-t', 'runTests')
    .registerFlag('-h', 'help')
    .registerFlag('-p', 'path');

if (cli.flags.help){
    console.log(':::::: USAGE ::::::::::::::::::::::::::::::::::');
    console.log('::: -p <path to project src> (optional) :::');
    console.log('::: -t run tests headless (optional) ::::::::::');
    console.log('::: -h help :::::::::::::::::::::::::::::::::::');
    console.log(':::::::::::::::::::::::::::::::::::::::::::::::');
    process.exit();
}

if (cli.flags.runTests){
    tmpl.load('home', 'reporter.html');

    server
        .setup({
            port: 3000,
            src: cli.flags.path,
            tests: '/specs',
            baseUrl: '/src'
        })
        .registerRoute('/', server.home)
        .registerRoute('/exit', server.exit)
        .registerRoute(server.BASEURL, server.src)
        .registerRoute('unknown', server.notFound)
        .start();

    var isWin = !!os.platform().match(/^win/)
        , phantomjsPath = path.join(__dirname, '../bin/phantomjs' + (isWin ? '.exe' : ''))
        , testRunnerPath = path.join(__dirname, './runner.js')
        , viewerPath = 'http://127.0.0.1:' + server.PORT;

    console.log(':::::: RUNNING SERVER [ ' + viewerPath + ' ]');
    console.log(':::::: PHANTOMJS [ ' + phantomjsPath + ' ]');
    var pjs = spawn(phantomjsPath, [testRunnerPath, viewerPath]);
    pjs.on('exit', function (code) {
        console.log(':::::: PHANTOMJS EXITED ' + (code === 0 ? 'OK' : 'FAIL') + ' [ code: ' + code + ' ]');
        server.end();
    });
    pjs.stdout.on('data', function (data) {
        console.log(':::::: PHANTOMJS: ' + data);
    });
}
