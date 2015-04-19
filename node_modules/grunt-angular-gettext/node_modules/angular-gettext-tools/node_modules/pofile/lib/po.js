var fs = require('fs');
var isArray = require('lodash.isarray');

function trim(string) {
    return string.replace(/^\s+|\s+$/g, '');
}

var PO = function () {
    this.comments = [];
    this.headers = {};
    this.items = [];
};

PO.prototype.save = function (filename, callback) {
    fs.writeFile(filename, this.toString(), callback);
};

PO.prototype.toString = function () {
    var lines = [];

    if (this.comments) {
        this.comments.forEach(function (comment) {
            lines.push('# ' + comment);
        });
    }

    lines.push('msgid ""');
    lines.push('msgstr ""');

    var keys = Object.keys(this.headers);
    var self = this;
    keys.forEach(function (key) {
        lines.push('"' + key + ': ' + self.headers[key] + '\\n"');
    });

    lines.push('');

    this.items.forEach(function (item) {
        lines.push(item.toString());
        lines.push('');
    });

    return lines.join('\n');
};

PO.load = function (filename, callback) {
    fs.readFile(filename, 'utf-8', function (err, data) {
        if (err) {
            return callback(err);
        }
        var po = PO.parse(data);
        callback(null, po);
    });
};

PO.parse = function (data) {
    //support both unix and windows newline formats.
    data = data.replace(/\r\n/g, '\n');
    var po = new PO();
    var sections = data.split(/\n\n/);
    var headers = sections.shift();
    var lines = sections.join('\n').split(/\n/);

    po.headers = {
        'Project-Id-Version': '',
        'Report-Msgid-Bugs-To': '',
        'POT-Creation-Date': '',
        'PO-Revision-Date': '',
        'Last-Translator': '',
        'Language': '',
        'Language-Team': '',
        'Content-Type': '',
        'Content-Transfer-Encoding': '',
        'Plural-Forms': '',
    };

    headers.split(/\n/).reduce(function (acc, line) {
        if (acc.merge) {
            //join lines, remove last resp. first "
            line = acc.pop().slice(0, -1) + line.slice(1);
            delete acc.merge;
        }
        if (/^".*"$/.test(line) && !/^".*\\n"$/.test(line)) {
            acc.merge = true;
        }
        acc.push(line);
        return acc;
    }, []).forEach(function (header) {
        if (header.match(/^#/)) {
            po.comments.push(header.replace(/^#\s*/, ''));
        }
        if (header.match(/^"/)) {
            header = header.trim().replace(/^"/, '').replace(/\\n"$/, '');
            var p = header.split(/:/);
            var name = p.shift().trim();
            var value = p.join(':').trim();
            po.headers[name] = value;
        }
    });

    var item = new PO.Item();
    var context = null;
    var plural = 0;
    var obsoleteCount = 0;
    var noCommentLineCount = 0;

    function finish() {
        if (item.msgid.length > 0) {
            if (obsoleteCount >= noCommentLineCount) {
                item.obsolete = true;
            }
            obsoleteCount = 0;
            noCommentLineCount = 0;
            po.items.push(item);
            item = new PO.Item();
        }
    }

    function extract(string) {
        string = trim(string);
        string = string.replace(/^[^"]*"|"$/g, '');
        string = string.replace(/\\([abtnvfr'"\\?]|([0-7]{3})|x([0-9a-fA-F]{2}))/g, function (match, esc, oct, hex) {
            if (oct) {
                return String.fromCharCode(parseInt(oct, 8));
            }
            if (hex) {
                return String.fromCharCode(parseInt(hex, 16));
            }
            switch (esc) {
                case 'a':
                    return '\x07';
                case 'b':
                    return '\b';
                case 't':
                    return '\t';
                case 'n':
                    return '\n';
                case 'v':
                    return '\v';
                case 'f':
                    return '\f';
                case 'r':
                    return '\r';
                default:
                    return esc;
            }
        });
        return string;
    }

    while (lines.length > 0) {
        var line = trim(lines.shift());
        var lineObsolete = false;
        var add = false;

        if (line.match(/^#\~/)) { // Obsolete item
            //only remove the obsolte comment mark, here
            //might be, this is a new item, so
            //only remember, this line is marked obsolete, count after line is parsed
            line = trim(line.substring(2));
            lineObsolete = true;
        }

        if (line.match(/^#:/)) { // Reference
            finish();
            item.references.push(trim(line.replace(/^#:/, '')));
        } else if (line.match(/^#,/)) { // Flags
            finish();
            var flags = trim(line.replace(/^#,/, '')).split(',');
            for (var i = 0; i < flags.length; i++) {
                item.flags[flags[i]] = true;
            }
        } else if (line.match(/^#($|\s+)/)) { // Translator comment
            finish();
            item.comments.push(trim(line.replace(/^#($|\s+)/, '')));
        } else if (line.match(/^#\./)) { // Extracted comment
            finish();
            item.extractedComments.push(trim(line.replace(/^#\./, '')));
        } else if (line.match(/^msgid_plural/)) { // Plural form
            item.msgid_plural = extract(line);
            context = 'msgid_plural';
            noCommentLineCount++;
        } else if (line.match(/^msgid/)) { // Original
            finish();
            item.msgid = extract(line);
            context = 'msgid';
            noCommentLineCount++;
        } else if (line.match(/^msgstr/)) { // Translation
            var m = line.match(/^msgstr\[(\d+)\]/);
            plural = m && m[1] ? parseInt(m[1]) : 0;
            item.msgstr[plural] = extract(line);
            context = 'msgstr';
            noCommentLineCount++;
        } else if (line.match(/^msgctxt/)) { // Context
            finish();
            item.msgctxt = extract(line);
            noCommentLineCount++;
        } else { // Probably multiline string or blank
            if (line.length > 0) {
                noCommentLineCount++;
                if (context === 'msgstr') {
                    item.msgstr[plural] += extract(line);
                } else if (context === 'msgid') {
                    item.msgid += extract(line);
                } else if (context === 'msgid_plural') {
                    item.msgid_plural += extract(line);
                }
            }
        }

        if (lineObsolete) {
            // Count obsolete lines for this item
            obsoleteCount++;
        }
    }
    finish();

    return po;
};

PO.Item = function () {
    this.msgid = '';
    this.msgctxt = null;
    this.references = [];
    this.msgid_plural = null;
    this.msgstr = [];
    this.comments = []; // translator comments
    this.extractedComments = [];
    this.flags = {};
    this.obsolete = false;
};

PO.Item.prototype.toString = function () {
    var lines = [];
    var self = this;

    // reverse what extract(string) method during PO.parse does
    var _escape = function (string) {
        // don't unescape \n, since string can never contain it
        // since split('\n') is called on it
        string = string.replace(/[\x07\b\t\v\f\r"\\]/g, function (match) {
            switch (match) {
                case '\x07':
                    return '\\a';
                case '\b':
                    return '\\b';
                case '\t':
                    return '\\t';
                case '\v':
                    return '\\v';
                case '\f':
                    return '\\f';
                case '\r':
                    return '\\r';
                default:
                    return '\\' + match;
            }
        });
        return string;
    };

    var _process = function (keyword, text, i) {
        var lines = [];
        var parts = text.split(/\n/);
        var index = typeof i !== 'undefined' ? '[' + i + ']' : '';
        if (parts.length > 1) {
            lines.push(keyword + index + ' ""');
            parts.forEach(function (part) {
                lines.push('"' + _escape(part) + '"');
            });
        } else {
            lines.push(keyword + index + ' "' + _escape(text) + '"');
        }
        return lines;
    };

    // https://www.gnu.org/software/gettext/manual/html_node/PO-Files.html
    // says order is translator-comments, extracted-comments, references, flags

    this.comments.forEach(function (c) {
        lines.push('# ' + c);
    });

    this.extractedComments.forEach(function (c) {
        lines.push('#. ' + c);
    });

    this.references.forEach(function (ref) {
        lines.push('#: ' + ref);
    });

    var flags = Object.keys(this.flags);
    if (flags.length > 0) {
        lines.push('#, ' + flags.join(','));
    }
    var mkObsolete = this.obsolete ? '#~ ' : '';

    ['msgctxt', 'msgid', 'msgid_plural', 'msgstr'].forEach(function (keyword) {
        var text = self[keyword];
        if (text != null) {
            if (isArray(text) && text.length > 1) {
                text.forEach(function (t, i) {
                    lines = lines.concat(mkObsolete + _process(keyword, t, i));
                });
            } else {
                text = isArray(text) ? text.join() : text;
                var processed = _process(keyword, text);
                //handle \n in single-line texts (can not be handled in _escape)
                for (var i = 1; i < processed.length - 1; i++) {
                    processed[i] = processed[i].slice(0, -1) + '\\n"';
                }
                lines = lines.concat(mkObsolete + processed.join('\n' + mkObsolete));
            }
        }
    });

    return lines.join('\n');
};

module.exports = PO;
