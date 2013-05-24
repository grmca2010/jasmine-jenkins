// VIEW RENDERER

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

module.exports = view;