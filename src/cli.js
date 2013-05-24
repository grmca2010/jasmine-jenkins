
// CLI
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

module.exports = config;