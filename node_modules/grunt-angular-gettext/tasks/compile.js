var Compiler = require('angular-gettext-tools').Compiler;

module.exports = function (grunt) {
    grunt.registerMultiTask('nggettext_compile', 'Compile strings from .po files', function () {
        var options = this.options();

        if (options.format && !Compiler.hasFormat(options.format)) {
            throw new Error('There is no "' + options.format + '" output format.');
        }

        var output = {};
        
        this.files.forEach(function (file) {
            var inputs = file.src.map(function (input) {
                return grunt.file.read(input);
            });

            if (!output[file.dest]) {
                output[file.dest] = inputs;
            } else {
                output[file.dest] = output[file.dest].concat(inputs);
            }
        });
        
        for (var dest in output) {
            var compiler = new Compiler(options);

            grunt.file.write(dest, compiler.convertPo(output[dest]));
        }
    });
};
