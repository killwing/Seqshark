(function() {

var nodes = [];
var seqs = [];
var intervals = [];
var minTitleLen = 17; // ip addr takes 15
var minInterval = 20;

var config = {
    msgTemplate: '# $',
    maxMsgLen: 10,
};

var genMessage = function(seq) {
    return config.msgTemplate.replace('#', seq.no)
        .replace('$', seq.info).slice(0, config.maxMsgLen);
};

var computeIntervals = function() {
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
    console.log(intervals);
};

var countIntervals = function(i, j) {
    if (i >= j) {
        return 0;
    }
    var sum = -1;
    for (var k = i; k != j; ++k) {
        sum += intervals[k] + 1;
    }
    return sum;
};

var ss = {};
ss.parsePsml = function() {
    var xml = '<psml version="0"> <structure> <section>No.</section> <section>Time</section> <section>Source</section> <section>Destination</section> <section>Protocol</section> <section>Length</section> <section>Info</section> </structure> <packet> <section>1207</section> <section>0.896614</section> <section>110.011.251.188</section> <section>80.156.149.133</section> <section>SIP</section> <section>338</section> <section>Request: OPTIONS sip:80.156.149.133:5060</section> </packet> <packet> <section>1208</section> <section>0.896616</section> <section>10.0.25.188</section> <section>80.156.149.133</section> <section>SIP</section> <section>342</section> <section>Request: OPTIONS sip:80.156.149.133:5060</section> </packet> <packet> <section>1209</section> <section>0.896616</section> <section>80.156.149.133</section> <section>80.156.149.133</section> <section>SIP</section> <section>342</section> <section>Request: OPTIONS sip:80.156.149.133:5060</section> </packet> </psml>';
    xmlDoc = $.parseXML(xml),
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
        // [id]name(ip)

        seqs.push({
            no: sections[0].textContent,
            time: sections[1].textContent,
            source: srcnode.id,
            destination: dstnode.id,
            protocol: sections[4].textContent,
            length: sections[5].textContent,
            info: sections[6].textContent,
        });
    });
    console.log(seqs);
    console.log(nodes);
    computeIntervals();
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

var corner = '+';
var bar = '|';
var topcorner = '.';
var btcorner = "'";

ss.drawNodes = function() {
    var boxline = new ut.StringBuilder();
    var text = new ut.StringBuilder();
    var blankline = new ut.StringBuilder();
    nodes.forEach(function(node, i) {
        var titleLen = computeTitleLen(node);

        boxline.push(corner);
        boxline.push('-'.dup(titleLen));
        boxline.push(corner);
        if (i != nodes.length-1) {
            boxline.push(' '.dup(intervals[i] - (titleLen +
                computeTitleLen(nodes[i+1]) + 2)/2));
        }

        text.push(bar);
        var gap = titleLen - node.ip.length;
        text.push(' '.dup(Math.floor(gap/2)));
        text.push(node.ip);
        text.push(' '.dup(Math.floor((gap+1)/2)));
        text.push(bar);
        if (i != nodes.length-1) {
            text.push(' '.dup(intervals[i] - (titleLen +
                computeTitleLen(nodes[i+1]) + 2)/2));
        }

        if (i == 0) {
            blankline.push(' '.dup(Math.floor(titleLen/2) + 1) + bar);
        }
        if (i != nodes.length-1) {
            blankline.push(' '.dup(intervals[i]) + bar);
        }
    });

    return boxline.toString() + '\n' + text.toString() + '\n' +
        boxline.toString() + '\n' + blankline.toString();
};

ss.drawSeqs = function() {
    seqs.forEach(function(seq) {
        if (seq.source != seq.destination) {
            var arrowline = new ut.StringBuilder();
            var msgline = new ut.StringBuilder();
            arrowline.push(' '.dup(Math.floor(computeTitleLen(nodes[0])/2) + 1) + bar);
            msgline.push(' '.dup(Math.floor(computeTitleLen(nodes[0])/2) + 1) + bar);

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
                            msgline.push(' '.dup(Math.floor(msgpad/2)) + msg + ' '.dup(Math.floor((msgpad+1)/2)) + bar);
                            break;
                        }
                    }
                }

                if (!found || afterfound) {
                    arrowline.push(' '.dup(intervals[i]) + bar);
                    msgline.push(' '.dup(intervals[i]) + bar);
                    ++i;
                } else {
                    i = j;
                    afterfound = true;
                }
            }

            console.log(msgline.toString() + '\n' + arrowline.toString());
        } else {
            var topline = new ut.StringBuilder();
            var btline = new ut.StringBuilder();
            topline.push(' '.dup(Math.floor(computeTitleLen(nodes[0])/2) + 1) + bar);
            for (var i = 0; i != nodes.length-1; ++i) {
                if (seq.source == nodes[i+1].id) {
                    topline.push(' '.dup(intervals[i] -
                        Math.floor(genMessage(seq).length/2) - 1) + topcorner +
                        '-'.dup(genMessage(seq).length) + topcorner);
                } else if (seq.source == nodes[i].id) {
                    topline.push(' '.dup(intervals[i] -
                        Math.floor((genMessage(seq).length-1)/2) - 1) + bar);
                } else {
                    topline.push(' '.dup(intervals[i]) + bar);
                }
            }
            console.log(topline.toString());
        }

    });
};

// exports
var root = this;
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ss;
} else if (!root.ss) {
    root.ss = ss;
}


})();


