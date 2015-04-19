'use strict';

var cheerio = require('cheerio');
var Po = require('pofile');
var espree = require('espree');
var search = require('binary-search');
var _ = require('lodash');

var escapeRegex = /[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g;
var noContext = '$$noContext';

function mkAttrRegex(startDelim, endDelim) {
    var start = startDelim.replace(escapeRegex, '\\$&');
    var end = endDelim.replace(escapeRegex, '\\$&');

    if (start === '' && end === '') {
        start = '^';
    } else {
        // match optional :: (Angular 1.3's bind once syntax) without capturing
        start += '(?:\\s*\\:\\:\\s*)?';
    }

    return new RegExp(start + '\\s*(\'|"|&quot;|&#39;)(.*?)\\1\\s*\\|\\s*translate\\s*(' + end + '|\\|)', 'g');
}

var noDelimRegex = mkAttrRegex('', '');

function localeCompare(a, b) {
    return a.localeCompare(b);
}

function comments2String(comments) {
    return comments.join(', ');
}

function walkJs(node, fn, parentComment) {
    fn(node, parentComment);

    for (var key in node) {
        var obj = node[key];
        if (node && node.leadingComments) {
            parentComment = node;
        }
        if (typeof obj === 'object') {
            walkJs(obj, fn, parentComment);
        }
    }
}

function getJSExpression(node) {
    var res = '';
    if (node.type === 'Literal') {
        res = node.value;
    }
    if (node.type === 'BinaryExpression' && node.operator === '+') {
        res += getJSExpression(node.left);
        res += getJSExpression(node.right);
    }
    return res;
}

var Extractor = (function () {
    function Extractor(options) {
        this.options = _.extend({
            startDelim: '{{',
            endDelim: '}}',
            markerName: 'gettext',
            markerNames: [],
            lineNumbers: true,
            extensions: {
                htm: 'html',
                html: 'html',
                php: 'html',
                phtml: 'html',
                tml: 'html',
                ejs: 'html',
                erb: 'html',
                js: 'js'
            },
            postProcess: function (po) {}
        }, options);
        this.options.markerNames.unshift(this.options.markerName);

        this.strings = {};
        this.attrRegex = mkAttrRegex(this.options.startDelim, this.options.endDelim);
    }

    Extractor.isValidStrategy = function (strategy) {
        return strategy === 'html' || strategy === 'js';
    };

    Extractor.mkAttrRegex = mkAttrRegex;

    Extractor.prototype.addString = function (reference, string, plural, extractedComment, context) {
        // maintain backwards compatibility
        if (_.isString(reference)) {
            reference = { file: reference };
        }

        string = string.trim();

        if (string.length === 0) {
            return;
        }

        if (!context) {
            context = noContext;
        }

        if (!this.strings[string]) {
            this.strings[string] = {};
        }

        if (!this.strings[string][context]) {
            this.strings[string][context] = new Po.Item();
        }

        var item = this.strings[string][context];
        item.msgid = string;

        var refString = reference.file;
        if (this.options.lineNumbers && reference.location && reference.location.start) {
            var line = reference.location.start.line;
            if (line || line === 0) {
                refString += ':' + reference.location.start.line;
            }
        }
        var refIndex = search(item.references, refString, localeCompare);
        if (refIndex < 0) { // don't add duplicate references
            // when not found, binary-search returns -(index_where_it_should_be + 1)
            item.references.splice(Math.abs(refIndex + 1), 0, refString);
        }

        if (context !== noContext) {
            item.msgctxt = context;
        }

        if (plural && plural !== '') {
            if (item.msgid_plural && item.msgid_plural !== plural) {
                throw new Error('Incompatible plural definitions for ' + string + ': ' + item.msgid_plural + ' / ' + plural + ' (in: ' + (item.references.join(', ')) + ')');
            }
            item.msgid_plural = plural;
            item.msgstr = ['', ''];
        }
        if (extractedComment) {
            var commentIndex = search(item.extractedComments, extractedComment, localeCompare);
            if (commentIndex < 0) { // don't add duplicate comments
                item.extractedComments.splice(Math.abs(commentIndex + 1), 0, extractedComment);
            }
        }
    };

    Extractor.prototype.extractJs = function (filename, src) {
        var self = this;
        var syntax;
        try {
            syntax = espree.parse(src, {
                tolerant: true,
                attachComment: true,
                loc: true,
                ecmaFeatures: {
                    arrowFunctions: true,
                    blockBindings: true,
                    destructuring: true,
                    regexYFlag: true,
                    regexUFlag: true,
                    templateStrings: true,
                    binaryLiterals: true,
                    octalLiterals: true,
                    unicodeCodePointEscapes: true,
                    defaultParams: true,
                    restParams: true,
                    forOf: true,
                    objectLiteralComputedProperties: true,
                    objectLiteralShorthandMethods: true,
                    objectLiteralShorthandProperties: true,
                    objectLiteralDuplicateProperties: true,
                    generators: true,
                    spread: true,
                    classes: true,
                    modules: true,
                    jsx: true,
                    globalReturn: true
                }
            });
        } catch (err) {
            return;
        }

        function isGettext(node) {
            return node !== null &&
                node.type === 'CallExpression' &&
                node.callee !== null &&
                (self.options.markerNames.indexOf(node.callee.name) > -1 || (
                    node.callee.property &&
                    self.options.markerNames.indexOf(node.callee.property.name) > -1
                )) &&
                node.arguments !== null &&
                node.arguments.length;
        }

        function isGetString(node) {
            return node !== null &&
                node.type === 'CallExpression' &&
                node.callee !== null &&
                node.callee.type === 'MemberExpression' &&
                node.callee.object !== null && (
                    node.callee.object.name === 'gettextCatalog' || (
                        // also allow gettextCatalog calls on objects like this.gettextCatalog.getString()
                        node.callee.object.property &&
                        node.callee.object.property.name === 'gettextCatalog')) &&
                node.callee.property !== null &&
                node.callee.property.name === 'getString' &&
                node.arguments !== null &&
                node.arguments.length;
        }

        function isGetPlural(node) {
            return node !== null &&
                node.type === 'CallExpression' &&
                node.callee !== null &&
                node.callee.type === 'MemberExpression' &&
                node.callee.object !== null && (
                    node.callee.object.name === 'gettextCatalog' || (
                        // also allow gettextCatalog calls on objects like this.gettextCatalog.getPlural()
                        node.callee.object.property &&
                        node.callee.object.property.name === 'gettextCatalog')) &&
                node.callee.property !== null &&
                node.callee.property.name === 'getPlural' &&
                node.arguments !== null &&
                node.arguments.length;
        }

        walkJs(syntax, function (node, parentComment) {
            var str;
            var context;
            var singular;
            var plural;
            var extractedComments = [];
            var reference = { file: filename, location: node ? node.loc : null };

            if (isGettext(node) || isGetString(node)) {
                str = getJSExpression(node.arguments[0]);
                if (node.arguments[2]) {
                    context = getJSExpression(node.arguments[2]);
                }
            } else if (isGetPlural(node)) {
                singular = getJSExpression(node.arguments[1]);
                plural = getJSExpression(node.arguments[2]);
            }
            if (str || singular) {
                var leadingComments = node.leadingComments || (parentComment ? parentComment.leadingComments : []);
                leadingComments.forEach(function (comment) {
                    if (comment.value.match(/^\/ .*/)) {
                        extractedComments.push(comment.value.replace(/^\/ /, ''));
                    }
                });
                if (str) {
                    self.addString(reference, str, plural, comments2String(extractedComments), context);
                } else if (singular) {
                    self.addString(reference, singular, plural, comments2String(extractedComments));
                }
            }
        });
    };

    Extractor.prototype.extractHtml = function (filename, src) {
        var extractHtml = function (src, lineNumber) {
            var $ = cheerio.load(src, { decodeEntities: false, withStartIndices: true });
            var self = this;

            var newlines = function (index) {
                return src.substr(0, index).match(/\n/g) || [];
            };
            var reference = function (index) {
                return {
                    file: filename,
                    location: {
                        start: {
                            line: lineNumber + newlines(index).length + 1
                        }
                    }
                };
            };

            $('*').each(function (index, n) {
                var node = $(n);
                var getAttr = function (attr) {
                    return node.attr(attr) || node.data(attr);
                };
                var str = node.html();
                var plural = getAttr('translate-plural');
                var extractedComment = getAttr('translate-comment');
                var context = getAttr('translate-context');

                if (n.name === 'script' && n.attribs.type === 'text/ng-template') {
                    extractHtml(node.text(), newlines(n.startIndex).length);
                    return;
                }

                if (node.is('translate')) {
                    self.addString(reference(n.startIndex), str, plural, extractedComment);
                    return;
                }

                for (var attr in node.attr()) {
                    if (attr === 'translate' || attr === 'data-translate') {
                        str = node.html(); // this shouldn't be necessary, but it is
                        self.addString(reference(n.startIndex), str, plural, extractedComment, context);
                    } else if (matches = noDelimRegex.exec(node.attr(attr))) {
                        str = matches[2].replace(/\\\'/g, '\'');
                        self.addString(reference(n.startIndex), str);
                    }
                }
            });

            var matches;
            while (matches = this.attrRegex.exec(src)) {
                var str = matches[2].replace(/\\\'/g, '\'');
                this.addString(reference(matches.index), str);
            }
        }.bind(this);

        extractHtml(src, 0);
    };

    Extractor.prototype.isSupportedByStrategy = function (strategy, extension) {
        return (extension in this.options.extensions) && (this.options.extensions[extension] === strategy);
    };

    Extractor.prototype.parse = function (filename, content) {
        var extension = filename.split('.').pop();

        if (this.isSupportedByStrategy('html', extension)) {
            this.extractHtml(filename, content);
        }
        if (this.isSupportedByStrategy('js', extension)) {
            this.extractJs(filename, content);
        }
    };

    Extractor.prototype.toString = function () {
        var catalog = new Po();

        catalog.headers = {
            'Content-Type': 'text/plain; charset=UTF-8',
            'Content-Transfer-Encoding': '8bit',
            'Project-Id-Version': ''
        };

        for (var msgstr in this.strings) {
            var msg = this.strings[msgstr];
            var contexts = Object.keys(msg).sort();
            for (var i = 0; i < contexts.length; i++) {
                catalog.items.push(msg[contexts[i]]);
            }
        }

        catalog.items.sort(function (a, b) {
            return a.msgid.localeCompare(b.msgid);
        });

        this.options.postProcess(catalog);

        return catalog.toString();
    };

    return Extractor;
})();

module.exports = Extractor;
