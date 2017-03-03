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
const Smarty = require('./lib/smarty4js');
const s = new Smarty();

const path = require('path');
const fs = require('fs');
const load = require('load-json-file');
const request = require('then-request');

function getFileName(npath) {
    if (typeof npath !== 'string') return npath;
    if (npath.length === 0) return npath;

    var name = path.basename(npath, path.extname(npath));

    return name;
}

function getDataManifestVal(dataManifest, filePath, baseDir) {

    dataManifest = dataManifest || {};
    filePath = path.normalize(filePath);
    baseDir = baseDir || '';

    let res = '';
    let dMArr = Object.keys(dataManifest);
    let len = dMArr.length;
    let n = 0;

    for (n; n < len; n++) {

        let k = dMArr[n];
        let dMval = dataManifest[k];
        let tmpFilePath = '';

        tmpFilePath = (/^[\/\\]/gi.test(k)) ? k : (baseDir + '/' + k);

        tmpFilePath = path.normalize(tmpFilePath);

        if (filePath === tmpFilePath) {
            res = dMval;
            break;
        }
    }

    return res;
}

function render(options) {
    options = options || {};

    s.conf.left_delimiter = options.left_delimiter || '{{';
    s.conf.right_delimiter = options.right_delimiter || '}}';

    let baseDir = options.baseDir;
    baseDir && s.setBasedir(baseDir);

    let templateDataDir = options.templateDataDir;
    let dataManifest = options.dataManifest || {};
    let rootDir = options.rootDir || '';
    let constPath = options.constPath || '';
    let commonConst = null;

    if (!/^[\/\\].+/gi.test(constPath)) {
        constPath = rootDir + '/' + constPath;
    }

    constPath = path.normalize(constPath);

    try {
        if (options.constPath && fs.existsSync(constPath)) {
            commonConst = load.sync(constPath);
        }
    } catch (e) {
        this.emit('error', new gutil.PluginError('gulp-smarty4js-render', e));
        return cb();
    }

    return through.obj(function (file, enc, cb) {

        if (file.isNull()) {
            this.push(file);
            return cb();
        }

        if (file.isStream()) {
            this.emit('error', new gutil.PluginError('gulp-smarty4js-render', 'Streaming not supported'));
        }

        var dataFile = '';
        var data = {};

        if (templateDataDir) {
            dataFile = [templateDataDir, '/', getFileName(file.path), '.json'].join('');
        }

        try {
            if (fs.existsSync(dataFile)) {
                data = load.sync(dataFile);
            }
        } catch (e) {
            this.emit('error', new gutil.PluginError('gulp-smarty4js-render', e));
            return cb();
        }

        var _me = this;

        var compileAsync = function (data, file, enc, cb) {
            var compiler = null;
            var html = '';

            Object.assign(data, commonConst);

            try {
                compiler = s.compile(file.path);
                html = compiler.render(data);
            } catch (e) {
                html = '';
                compiler = null;

                this.emit('error', new gutil.PluginError('gulp-smarty4js-render', e));
                return cb();
            }

            if (file.isBuffer()) {
                file.contents = new Buffer(html);
                file.path = gutil.replaceExtension(file.path, '.html');
            }

            this.push(file);
            return cb();
        };

        let dMVal = getDataManifestVal(dataManifest, file.path, baseDir);

        if (dMVal.length) {
            request('GET', dMVal).done(function (res) {

                var data = (res.getBody().toString());

                try {
                    data = JSON.parse(data);
                    compileAsync.apply(_me, [data, file, enc, cb]);
                } catch (e) {
                    this.emit('error', new gutil.PluginError('gulp-smarty4js-render', e));
                    return cb();
                }
            });
        } else {
            compileAsync.apply(_me, [data, file, enc, cb]);
        }
    });
}

module.exports = render;
