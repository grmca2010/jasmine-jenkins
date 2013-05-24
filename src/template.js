
var fs = require('fs')
    , path = require('path');

// TEMPLATE LOADER
var template = (function(){
    var t = {};

    t.collection = {};

    t.load = function(name, filePath){
        template.collection[name] = fs.readFileSync(path.resolve(__dirname, filePath), 'utf-8');
        return this;
    };

    t.get = function(name){
        return template.collection[name];
    };

    return t;
}());

module.exports = template;
