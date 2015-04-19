'use strict';

var po = require('pofile');
var _ = require('lodash');

var formats = {
    javascript: {
        addLocale: function (locale, strings) {
            return '    gettextCatalog.setStrings(\'' + locale + '\', ' + JSON.stringify(strings) + ');\n';
        },
        format: function (locales, options) {
            var module = 'angular.module(\'' + options.module + '\')' +
                            '.run([\'gettextCatalog\', function (gettextCatalog) {\n' +
                                '/* jshint -W100 */\n' +
                                locales.join('') +
                                '/* jshint +W100 */\n';
            if (options.defaultLanguage) {
                module += 'gettextCatalog.currentLanguage = \'' + options.defaultLanguage + '\';\n';
            }
            module += '}]);';

            if (options.requirejs) {
                return 'define([\'angular\', \'' + options.modulePath + '\'], function (angular) {\n' + module + '\n});';
            }

            return module;
        }
    },
    json: {
        addLocale: function (locale, strings) {
            return {
                name: locale,
                strings: strings
            };
        },
        format: function (locales, options) {
            var result = {};
            locales.forEach(function (locale) {
                if (!result[locale.name]) {
                    result[locale.name] = {};
                }
                _.assign(result[locale.name], locale.strings);
            });
            return JSON.stringify(result);
        }
    }
};

var noContext = '$$noContext';

var Compiler = (function () {
    function Compiler(options) {
        this.options = _.extend({
            format: 'javascript',
            module: 'gettext'
        }, options);
    }

    Compiler.hasFormat = function (format) {
        return formats.hasOwnProperty(format);
    };

    Compiler.prototype.convertPo = function (inputs) {
        var format = formats[this.options.format];
        var locales = [];

        inputs.forEach(function (input) {
            var catalog = po.parse(input);

            if (!catalog.headers.Language) {
                throw new Error('No Language header found!');
            }

            var strings = {};
            for (var i = 0; i < catalog.items.length; i++) {
                var item = catalog.items[i];
                var ctx = item.msgctxt || noContext;
                if (item.msgstr[0].length > 0 && !item.flags.fuzzy && !item.obsolete) {
                    if (!strings[item.msgid]) {
                        strings[item.msgid] = {};
                    }

                    // Add array for plural, single string for signular.
                    strings[item.msgid][ctx] = item.msgstr.length === 1 ? item.msgstr[0] : item.msgstr;
                }
            }

            // Strip context from strings that have no context.
            for (var key in strings) {
                if (Object.keys(strings[key]).length === 1 && strings[key][noContext]) {
                    strings[key] = strings[key][noContext];
                }
            }

            locales.push(format.addLocale(catalog.headers.Language, strings));
        });

        return format.format(locales, this.options);
    };

    return Compiler;
})();

module.exports = Compiler;
