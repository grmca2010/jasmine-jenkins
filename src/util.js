var fs = require('fs')
    , path = require('path');

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

module.exports = util;
