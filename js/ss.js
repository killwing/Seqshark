(function() {

var nodes = [];
var seqs = [];
var intervals = [];
var minTitleLen = 17; // ip addr takes 15
var minInterval = 20;

var config = {
    msgFmt: '',
    maxMsgLen: 20,
    showNo: true,
    ui: {
        corner: '+',
        topcorner: '.',
        btcorner: "'",
        bar: '|',
        space: ' ',
        newline: '\n',
    },

    seqText: function() {
/* [1]Alice(192.168.1.1) | [2]atlanta.com(192.168.1.2) | [3]biloxi.com(192.168.2.1) | [4]Bob(192.168.2.2)

  |1   |   |off hook
 1|1->2|sip|INVITE
 2|2->1|sip|100 Trying
 3|2->3|sip|INVITE
 4|3->2|sip|100 Trying
 5|3->4|sip|INVITE
 6|4->3|sip|180 Ringing
 7|3->2|sip|180 Ringing
 8|2->1|sip|180 Ringing
 9|4->3|sip|200 OK
10|3->2|sip|200 OK
11|2->1|sip|200 OK
12|1->4|sip|ACK
  |4   |   |on hook
13|4->1|sip|BYE
14|1->4|sip|200 OK
*/
    },

    protoFilter: ['SIP', 'ISUP'],
};

var rtConfig = {
    showName: false,
    showIp: false,
};

var genMessage = function(seq) {
    var msg = '';
    if (config.showNo && seq.no) {
        msg += seq.no + '. ';
    }
    msg += seq.info;
    return msg.slice(0, config.maxMsgLen);
};

var computeIntervals = function() {
    intervals = [];

    intervals.push(minInterval); // leftest
    for (var i = 0; i != nodes.length-1; ++i) {
        var intv = minInterval;
        seqs.forEach(function(seq) {
            if ((seq.source == nodes[i].id && seq.destination == nodes[i+1].id)
             || (seq.source == nodes[i+1].id && seq.destination == nodes[i].id)) {
                 var msg = genMessage(seq);
                 if (msg.length > intv) {
                     intv = msg.length;
                 }
            }
        });
        intervals.push(intv);
    }
    console.debug('intervals', intervals);
};

// i, j is node's index
var countIntervals = function(i, j) {
    if (i >= j) {
        return 0;
    }
    var sum = -1;
    for (var k = i+1; k != j+1; ++k) {
        sum += intervals[k] + 1;
    }
    return sum;
};

var computeTitleLen = function(node) {
    var titleLen = minTitleLen;
    if (node.name.length+2 > titleLen) {
        titleLen = node.name.length + 2; // two spaces
    }
    if (!titleLen%2) { // make odd
        ++titleLen;
    }
    return titleLen;
};


var ss = {};
ss.getConfig = function() {
    return config;
};

ss.resetData = function() {
    nodes = [];
    seqs = [];
    intervals = [];
};

ss.parseFormattedStr = function(text) {
    ss.resetData();

    var str = text.split('\n');
    var nodeslist = str[0].split('|');
    nodeslist.forEach(function(node, i) {
        var nodeinfo =
          /\[(\d+)\]([\w\.\-\_]*)(\(([\d\.]+)\))?/.exec(node);
        if (nodeinfo) {
            var found = false;
            for (var i = 0; i != nodes.length; ++i) {
                if (nodes[i].id == nodeinfo[1]) {
                    found = true;
                    break;
                }
            }
            if (!found) {
                nodes.push({
                    id: nodeinfo[1],
                    name: nodeinfo[2] || '',
                    ip: nodeinfo[4] || '',
                });
            }
        }
    });

    str.forEach(function(seq, i) {
        var seqinfo = /(\d*)\s*\|\s*(\d+)\s*(->\s*(\d+))?\s*\|(.*?)\|(.*)/.exec(seq);
        if (seqinfo) {
            seqs.push({
                no: seqinfo[1] || '',
                time: '',
                source: seqinfo[2],
                destination: seqinfo[4] || seqinfo[2],
                protocol: seqinfo[5].trim().toUpperCase(),
                length: '',
                info: seqinfo[6].trim(),
            });
        }
    });

    console.debug(nodes);
    console.debug(seqs);
    computeIntervals();
};


ss.formatToStr = function() {
    var nodesStr = new ut.StringBuilder();
    var seqsStr = new ut.StringBuilder();
    nodes.forEach(function(node, i) {
        nodesStr.push('['+node.id+']');
        if (node.name) {
            nodesStr.push(node.name);
        }
        if (node.ip) {
            nodesStr.push('('+node.ip+')');
        }
        if (i == nodes.length-1) {
            nodesStr.push('\n');
        } else {
            nodesStr.push('|');
        }
    });
    nodesStr.push('\n');

    seqs.forEach(function(seq, i) {
        seqsStr.push(seq.no+'|');
        seqsStr.push(seq.source+'->'+seq.destination+'|');
        seqsStr.push(seq.protocol+'|');
        seqsStr.push(seq.info+'\n')
    });
    return nodesStr.toString() + seqsStr.toString();
};

ss.parsePsml = function(psml) {
    ss.resetData();

    xmlDoc = $.parseXML(psml),
    $packets = $(xmlDoc).find('psml packet');
    $.each($packets, function(i, packet) {
        var sections = $(packet).children('section');
        var src = sections[2].textContent;
        var dst = sections[3].textContent;

        var srcfound, dstfound;
        var srcnode, dstnode;
        for (var i = 0; i != nodes.length; ++i) {
            if (nodes[i].ip == src) {
                srcnode = nodes[i];
                srcfound = true;
            }
        }
        if (!srcfound) {
            srcnode = {
                id: nodes.length,
                name: '',
                ip: src,
            };
            nodes.push(srcnode);
        }

        for (var i = 0; i != nodes.length; ++i) {
           if (nodes[i].ip == dst) {
                dstnode = nodes[i];
                dstfound = true;
           }
        }
        if (!dstfound) {
            dstnode = {
                id: nodes.length,
                name: '',
                ip: dst,
            }
            nodes.push(dstnode);
        }

        // only take main protocol
        var prot = sections[4].textContent;
        var protsep = prot.indexOf('/');
        if (protsep != -1) {
            prot = prot.substring(0, protsep);
        }
        protsep = prot.indexOf('(');
        if (protsep != -1) {
            prot = prot.substring(0, protsep);
        }

        seqs.push({
            no: sections[0].textContent,
            time: sections[1].textContent,
            source: srcnode.id,
            destination: dstnode.id,
            protocol: prot,
            length: sections[5].textContent,
            info: sections[6].textContent,
        });
    });

    console.debug(seqs);
    console.debug(nodes);
    computeIntervals();
};


var buildNodes = function() {
    var boxline = new ut.StringBuilder();
    var textip = new ut.StringBuilder();
    var textname = new ut.StringBuilder();
    var blankline = new ut.StringBuilder();
    var bar = config.ui.bar;
    var space = config.ui.space;

    nodes.forEach(function(node, i) {
        var titleLen = computeTitleLen(node);
        var gap = '';

        if (i == 0) {
            gap = space.dup(intervals[i] - Math.floor(titleLen/2) - 1);
            boxline.push(gap);
            textip.push(gap);
            textname.push(gap);
        }

        blankline.push(space.dup(intervals[i]) + bar);

        boxline.push(config.ui.corner);
        boxline.push('-'.dup(titleLen));
        boxline.push(config.ui.corner);

        textip.push(bar);
        gap = titleLen - node.ip.length;
        textip.push(space.dup(Math.floor(gap/2)));
        textip.push(node.ip);
        textip.push(space.dup(Math.floor((gap+1)/2)));
        textip.push(bar);
        rtConfig.showIp = rtConfig.showIp || node.ip.length != 0;

        textname.push(bar);
        gap = titleLen - node.name.length;
        textname.push(space.dup(Math.floor(gap/2)));
        textname.push(node.name);
        textname.push(space.dup(Math.floor((gap+1)/2)));
        textname.push(bar);
        rtConfig.showName = rtConfig.showName || node.name.length != 0;

        if (i != nodes.length-1) {
            gap = space.dup(intervals[i+1] - (titleLen +
                computeTitleLen(nodes[i+1]) + 2)/2);
            boxline.push(gap);
            textip.push(gap);
            textname.push(gap);
        }
    });

    return {
        boxline: boxline,
        textname: textname,
        textip: textip,
        blankline: blankline,
    };
};


var buildSeqs = function() {
    var seqsline = [];
    var bar = config.ui.bar;
    var space = config.ui.space;

    seqs.forEach(function(seq) {
        
        // filter protocol
        if (seq.protocol && config.protoFilter.indexOf(seq.protocol) == -1) {
            return;
        }

        if (seq.source != seq.destination) {
            var arrowline = new ut.StringBuilder();
            var msgline = new ut.StringBuilder();
            arrowline.push(space.dup(intervals[0]) + bar);
            msgline.push(space.dup(intervals[0]) + bar);

            var i = 0;
            var found = false;
            var afterfound = false;
            while (i < nodes.length-1) {
                if (!found) {
                    for (var j = i+1; j != nodes.length; ++j) {
                        var pad = '-'.dup(countIntervals(i, j) - 1);
                        if (seq.source == nodes[i].id && seq.destination == nodes[j].id) {
                            found = true;
                            arrowline.push(pad + '>' + bar);
                        } else if (seq.source == nodes[j].id && seq.destination == nodes[i].id) {
                            found = true;
                            arrowline.push('<' + pad + bar);
                        }

                        if (found) {
                            var msg = genMessage(seq);
                            var msgpad = countIntervals(i, j) - msg.length;
                            msgline.push(space.dup(Math.floor(msgpad/2)) + msg +
                                space.dup(Math.floor((msgpad+1)/2)) + bar);
                            break;
                        }
                    }
                }

                if (!found || afterfound) {
                    arrowline.push(space.dup(intervals[i+1]) + bar);
                    msgline.push(space.dup(intervals[i+1]) + bar);
                    ++i;
                } else {
                    i = j;
                    afterfound = true;
                }
            }

            seqsline.push(msgline);
            seqsline.push(arrowline);
        } else {
            var topline = new ut.StringBuilder();
            var btline = new ut.StringBuilder();
            var msgline = new ut.StringBuilder();
            for (var i = -1; i != nodes.length-1; ++i) {
                if (seq.source == nodes[i+1].id) {
                    topline.push(space.dup(intervals[i+1] -
                        Math.floor(genMessage(seq).length/2) - 1) + config.ui.topcorner +
                        '-'.dup(genMessage(seq).length) + config.ui.topcorner);
                    btline.push(space.dup(intervals[i+1] -
                        Math.floor(genMessage(seq).length/2) - 1) + config.ui.btcorner +
                        '-'.dup(genMessage(seq).length) + config.ui.btcorner);
                    msgline.push(space.dup(intervals[i+1] -
                        Math.floor(genMessage(seq).length/2) - 1) + bar +
                        genMessage(seq) + bar);
                } else if (i != -1 && seq.source == nodes[i].id) {
                    var gap = intervals[i+1] - Math.floor((genMessage(seq).length-1)/2) - 1;
                    topline.push(space.dup(gap) + bar);
                    btline.push(space.dup(gap) + bar);
                    msgline.push(space.dup(gap) + bar);
                } else {
                    topline.push(space.dup(intervals[i+1]) + bar);
                    btline.push(space.dup(intervals[i+1]) + bar);
                    msgline.push(space.dup(intervals[i+1]) + bar);
                }
            }

            seqsline.push(topline);
            seqsline.push(msgline);
            seqsline.push(btline);
        }
    });

    return seqsline;
};

ss.buildAll = function() {
    var all = [];
    var nodesline = buildNodes();
    all.push(nodesline.boxline);
    if (rtConfig.showName) {
        all.push(nodesline.textname);
    }
    if (rtConfig.showIp) {
        all.push(nodesline.textip);
    }
    all.push(nodesline.boxline);
    all.push(nodesline.blankline);

    all = all.concat(buildSeqs());
    all.push(nodesline.blankline);
    return all.join(config.ui.newline);
};

ss.initPage = function() {
    $('#seqtext textarea').val(config.seqText.mlstr());
    $('#seqtext textarea').keyup(function() {
        ss.parseFormattedStr($('#seqtext textarea').val());
        $('#seq textarea').val(ss.buildAll());
    });

    // first show
    ss.parseFormattedStr($('#seqtext textarea').val());
    $('#seq textarea').val(ss.buildAll());

    $('#psml-file-data').change(function() {
        var file = this.files[0];
        if (!file) {
            return;
        }

        $('#psml-file-name').text(file.fileName);
        var reader = new FileReader();
        reader.readAsText(file);
        reader.onload = function(e) {
            ss.parsePsml(this.result);
            $('#seq textarea').val(ss.buildAll());
            $('#seqtext textarea').val(ss.formatToStr());
        };
    });

    $('#psml-file-browse').click(function() {
        $('#psml-file-data').click();
    });

    $('#show-number-cb').prop('checked', config.showNo);
    $('#show-number-cb').change(function() {
        config.showNo = $(this).prop('checked');
        $('#seq textarea').val(ss.buildAll());
    });

    $('#max-msg-len').val(config.maxMsgLen);
    $('#max-msg-len').change(function() {
        var len = $(this).val();
        if (!/\d+/.test(len) || len <= 0) {
            len = config.maxMsgLen;
        }
        $(this).val(len);
        config.maxMsgLen = len;
        // re-compute
        computeIntervals();
        $('#seq textarea').val(ss.buildAll());
    });

    $('#protocol-filter').val(config.protoFilter.join(','));
    $('#protocol-filter').change(function() {
        var filters = $(this).val().toUpperCase().split(',');
        if (filters.length) {
            config.protoFilter = filters;
            $('#seq textarea').val(ss.buildAll());
        }
    });

    $('#message-format').val(config.msgFormat);
    $('#message-format').change(function() {
    });
};

// exports
var root = this;
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ss;
} else if (!root.ss) {
    root.ss = ss;
}

//var sipfmt = ut.escapeRegex('Request: (\w+) sip:.+|Status: ([\w ]+),?.*');
//var sipfmtRe = new RegExp(sipfmt, 'Request: INVITE sip:34324@efdr');

})();


