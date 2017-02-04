/**
 * @author: laoono
 * @date:  2017-02-03
 * @time: 16:29
 * @contact: laoono.com
 * @description: #
 */

'use strict';

const through = require('through2');
const gutil = require('gulp-util');
const Smarty = require('smarty4js');
const s = new Smarty();

function render(options) {
    options = options || {};

    s.conf.left_delimiter = options.left_delimiter || '{{';
    s.conf.right_delimiter = options.right_delimiter || '}}';

    let baseDir = options.baseDir;
    baseDir && s.setBasedir(baseDir);

    return through.obj(function (file, enc, cb) {
        if (file.isNull()) {
            this.push(file);
            return cb();
        }

        const compiler = s.compile(file.path);
        var html = compiler.render();

        if (file.isStream()) {
            this.emit('error', new gutil.PluginError('gulp-smarty4js-render', 'Streaming not supported'));
        }

        if (file.isBuffer()) {
            file.contents = new Buffer(html);
            file.path = gutil.replaceExtension(file.path, '.html');
        }

        this.push(file);
        cb();
    });
}

module.exports = render;