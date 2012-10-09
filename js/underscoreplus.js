// underscoreplus.js v0.1.1

(function() {

'use strict';

var usp = {};

// Duplicate strings
usp.dup = function(s, n) {
    var a = [];
    while (n--) {
        a.push(s);
    }
    return a.join('');
};


// Multi-line string using function definition + comment
usp.mlstr = function(f) {  
    var lines = f.toString();
    return lines.substring(lines.indexOf("/*") + 2, lines.lastIndexOf("*/"));
};

// Delete specific values in a Array inplace
usp.erase = function(a, deleteValue) {
    for (var i = 0; i < a.length; i++) {
        if (a[i] === deleteValue) {         
            a.splice(i, 1);
            i--;
        }
    }
    return a;
};

// class inherit
usp.inherits = function(ctor, superCtor) {
    ctor.super_ = superCtor;
    ctor.prototype = Object.create(superCtor.prototype, {
        constructor: {
            value: ctor,
            enumerable: false,
            writable: true,
            configurable: true
        }
    });
};

// Decodes a URL-encoded string into key/value pairs.
usp.formDecode = function(encoded) {
    var params = encoded.split('&');
    var decoded = {};
    for (var i = 0; i !== params.length; i++) {
        var keyval = params[i].split('=');
        if (keyval.length === 2) {
            var key = usp.fromRfc3986(keyval[0]);
            var val = usp.fromRfc3986(keyval[1]);
            decoded[key] = val;
        }
    }
    return decoded;
};

// Returns the querystring decoded into key/value pairs.
usp.getQueryStringParams = function(s) {
    var urlparts = s.split('?');
    if (urlparts.length === 2) {
        return usp.formDecode(urlparts[1]);
    } else {
        return usp.formDecode(s);
    }
};

// Encodes a value according to the RFC3986 specification.
usp.toRfc3986 = function(val) {
    return encodeURIComponent(val).replace(/\!/g, '%21')
                                  .replace(/\*/g, '%2A')
                                  .replace(/'/g, '%27')
                                  .replace(/\(/g, '%28')
                                  .replace(/\)/g, '%29');
};

// Decodes a string that has been encoded according to RFC3986.
usp.fromRfc3986 = function(val) {
    var tmp = val.replace(/%21/g, '!')
                 .replace(/%2A/g, '*')
                 .replace(/%27/g, "'")
                 .replace(/%28/g, '(')
                 .replace(/%29/g, ')');
    return decodeURIComponent(tmp);
};

// Adds a key/value parameter to the supplied URL.
usp.addURLParam = function(url, key, value) {
    var sep = (url.indexOf('?') >= 0) ? '&' : '?';
    return url + sep + usp.toRfc3986(key) + '=' + usp.toRfc3986(value);
};

// Regex escaping
usp.escapeRegex = function(re) {
    return re.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g, "\\$&");
};

// Add blank target to URL
usp.addBlankTarget = function(a) {
    return a.replace(/^<a /, '<a target="_blank" ');
};


// exports
var root = this;
if (typeof module !== 'undefined' && module.exports) {
    try {
        var _ = require('underscore');
        _.mixin(usp);
        module.exports = _;
    } catch (e) {
        module.exports = usp;
    }
} else if (root._) {
    root._.mixin(usp);
} else {
    root._ = usp;
}


}).call(this);

