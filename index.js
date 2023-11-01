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
const Smarty2 = require('smarty.js');

const path = require('path');
const fs = require('fs');
const load = require('load-json-file');
const request = require('then-request');

function getFileName(npath) {
  if (typeof npath !== 'string') return npath;
  if (npath.length === 0) return npath;

  return path.basename(npath, path.extname(npath));
}

function getDataManifestVal(dataManifest, filePath, baseDir) {

  dataManifest = dataManifest || {};
  filePath = path.normalize(filePath);
  baseDir = baseDir || '';

  let res = '';
  let key = '';
  let dMArr = Object.keys(dataManifest);
  let len = dMArr.length;
  let n = 0;

  for (n; n < len; n++) {

    let k = dMArr[n];
    let dMval = dataManifest[k];
    let tmpFilePath = '';

    tmpFilePath = (/^[\/\\]/gi.test(k)) ? k : path.resolve(baseDir, k);

    tmpFilePath = path.normalize(tmpFilePath);

    if (filePath === tmpFilePath) {
      res = dMval;
      key = k;
      break;
    }
  }

  return {
    key: key,
    value: res
  };
}

function render(options) {
  options = options || {};
  const baseDir = options.baseDir;
  const leftDelimiter = options.left_delimiter || '{{';
  const rightDelimiter = options.left_delimiter || '}}';

  Smarty2.prototype.left_delimiter = leftDelimiter;
  Smarty2.prototype.right_delimiter = rightDelimiter;

  Smarty2.prototype.getTemplate = function (name) {
    return fs.readFileSync(`${baseDir}/${name}`, 'utf8');
  }

  Smarty2.prototype.getFile = function(name) {
    return fs.readFileSync(`${baseDir}/${name}`, 'utf8');
  }

  let templateDataDir = options.templateDataDir;
  let dataManifest = options.dataManifest || {};
  let rootDir = options.rootDir || '';
  let constPath = options.constPath || '';
  let commonConst = null;
  let commonConstTemp = {};
  let commonConstRoot = {};

  let constPathTemp = path.resolve(templateDataDir, constPath);
  let constPathRoot = path.resolve(rootDir, constPath);

  try {
    if (options.constPath) {
      if (fs.existsSync(constPathTemp)) {
        commonConstTemp = load.sync(constPathTemp);
      }

      if (fs.existsSync(constPathRoot)) {
        commonConstRoot = load.sync(constPathRoot);
      }
    }
  } catch (e) {
    return through.obj(function (file, enc, cb) {
      this.emit('error', new gutil.PluginError('gulp-smarty4js-render', e));
      return cb();
    });
  }

  commonConst = Object.assign(commonConstRoot, commonConstTemp);

  return through.obj(function (file, enc, cb) {

    const self = this;
    if (file.isNull()) {
      this.push(file);
      return cb();
    }

    if (file.isStream()) {
      this.emit('error', new gutil.PluginError('gulp-smarty4js-render', 'Streaming not supported'));
    }

    let dataFile = '';
    let data = {};

    let _me = this;

    const compileAsync = function (data, file, enc, cb) {
      Object.assign(data, commonConst);

      let html = '';
      let jSmart = null;

      const fileContents = file.contents.toString('utf8');

      try {
        jSmart = new Smarty2(fileContents);
        html = jSmart.fetch(data);
      } catch (e) {
        html = '';
        this.emit('error', new gutil.PluginError('gulp-smarty4js-render', e));
        return cb();
      }

      if (file.isBuffer()) {
        file.contents = new Buffer(html);
        file.path = gutil.replaceExtension(file.path, '.html');
      }

      this.push(file);
      jSmart = null;
      return cb();
    };

    let dM = getDataManifestVal(dataManifest, file.path, templateDataDir);
    let dMVal = dM.value;
    let dMKey = dM.key.replace(/[\/\\]/gi, '$');
    const valDataFile = path.resolve(templateDataDir, dMVal);
    dMKey = dMKey.replace(/^\.+/gi, '');

    if (templateDataDir) {
      dataFile = path.normalize([path.resolve(templateDataDir + '/data/', getFileName(dMKey)), '.json'].join(''));
    }

    if (fs.existsSync(valDataFile) && !fs.lstatSync(valDataFile).isDirectory()) {
      try {
        data = load.sync(valDataFile);
      } catch (e) {
        this.emit('error', new gutil.PluginError('gulp-smarty4js-render', e));
        return cb();
      }

      compileAsync.apply(_me, [data, file, enc, cb]);
    } else if (fs.existsSync(dataFile)) {
      try {
        data = load.sync(dataFile);
      } catch (e) {
        this.emit('error', new gutil.PluginError('gulp-smarty4js-render', e));
        return cb();
      }

      compileAsync.apply(_me, [data, file, enc, cb]);
    } else {

      if (/^http(s|):\/\//gi.test(dMVal)) {

        request('GET', dMVal).done(function (res) {

          let data = (res.getBody().toString());

          try {
            data = JSON.parse(data);
          } catch (e) {
            self.emit('error', new gutil.PluginError('gulp-smarty4js-render', e));
            return cb();
          }

          compileAsync.apply(_me, [data, file, enc, cb]);
        });
      } else {
        compileAsync.apply(_me, [data, file, enc, cb]);
      }
    }
  });
}

module.exports = render;
