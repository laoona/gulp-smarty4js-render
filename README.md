# gulp-smarty4js-render
> render smarty templates to *.html

# Abstract

My usecase is fully rendering smarty templates with data for slice-cli livereload preview. 

# Install

`npm install gulp-smarty4js-render --save-dev`

# Usage

The plugin will apply to any smarty templates 

The output will be a rendered HTML file per template. 

```javascript
var gulp       = require('gulp'),
    render     = require('gulp-smarty4js-render');

gulp.task('html', function () {
    gulp.src('./src/templates/*.tpl')
    .pipe(gulp.dest('build/'))
});
```

## API

gulp-smarty4js-render can be called with options Object 

### replace([options])

#### options
Type: `Object`

##### options.left_delimiter
Type: `String`  
Default: `{{`

##### options.right_delimiter
Type: `String`  
Default: `}}`

##### options.baseDir
Type: `String`  
Default: ``

// if compile source is template code and have `include, extend...` sentence in code
// you must give a path
