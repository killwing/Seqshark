(function() {
    var nodes = [];
    var seqs = [];
    var defDimWidth = 17; // ip addr takes 15

    var ss = {};
    ss.parsePsml = function() {
        var xml = '<psml version="0"> <structure> <section>No.</section> <section>Time</section> <section>Source</section> <section>Destination</section> <section>Protocol</section> <section>Length</section> <section>Info</section> </structure> <packet> <section>1207</section> <section>0.896614</section> <section>110.011.251.188</section> <section>80.156.149.133</section> <section>SIP</section> <section>338</section> <section>Request: OPTIONS sip:80.156.149.133:5060</section> </packet> <packet> <section>1208</section> <section>0.896616</section> <section>10.0.25.188</section> <section>80.156.149.133</section> <section>SIP</section> <section>342</section> <section>Request: OPTIONS sip:80.156.149.133:5060</section> </packet> </psml>';
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
                else if (nodes[i].ip == dst) {
                    dstnode = nodes[i];
                    dstfound = true;
                }
            }

            if (!srcfound) {
                srcnode = {
                    id: nodes.length,
                    name: '',
                    ip: src,
                    dim: {
                        lwidth: defDimWidth,
                        rwidth: defDimWidth,
                    }
                };
                nodes.push(srcnode);
            }
            if (!dstfound) {
                dstnode = {
                    id: nodes.length,
                    name: '',
                    ip: dst,
                    dim: {
                        lwidth: defDimWidth,
                        rwidth: defDimWidth,
                    }
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
    };


    var corner = '+';
    ss.drawNodes = function() {
        // 1st line
        var line = new ut.StringBuilder();
        var text = new ut.StringBuilder();
        nodes.forEach(function(node, i) {
            var titleLen = defDimWidth;
            if (node.name.length+2 > titleLen) {
                titleLen = node.name.length + 2;
            }
            line.push(' '.dup(node.dim.lwidth - Math.floor(titleLen/2)));
            line.push(corner);
            line.push('-'.dup(titleLen));
            line.push(corner);
            line.push(' '.dup(node.dim.rwidth - Math.floor(titleLen/2)));

            text.push(' '.dup(node.dim.lwidth - Math.floor(titleLen/2)));
            text.push('|');
            var gap = titleLen - node.ip.length;
            var leftg = Math.floor(gap/2);
            var rightg = leftg;
            if (gap%2) {
                ++rightg;
            }
            text.push(' '.dup(leftg));
            text.push(node.ip);
            text.push(' '.dup(rightg));
            text.push('|');
            text.push(' '.dup(node.dim.rwidth - Math.floor(titleLen/2)));
        });

        return line.toString() + '\n' + text.toString() + '\n' + line.toString();
    };

    // exports
    var root = this;
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = ss;
    } else if (!root.ss) {
        root.ss = ss;
    }

})();


