const
    gulp = require('gulp'),
    plumber = require('gulp-plumber'),
    nunjucksRender = require('gulp-nunjucks-render'),
    data = require('gulp-data'),
    ts = require("gulp-typescript"),
    browserify = require("browserify"),
    source = require('vinyl-source-stream'),
    tsify = require("tsify"),
    gutil = require('gulp-util'),
    LIBS = ['jquery', 'tether', 'bootstrap', 'jrumble', 'ramda'],
    dirs = {
        src: './app/',
        build: './build/'
    };
    dirs.jsOut = dirs.build + 'js/';
    dirs.tsSrc = dirs.src + 'js/';

// Compile nunjucks to html
gulp.task('nunjucks', function() {
  return gulp.src(dirs.src + 'pages/**/*.+(html|nunjucks)')
      // Adding data to Nunjucks
      .pipe(data(function() {
          return require(dirs.src + 'data.json')
      }))
      .pipe(nunjucksRender({
          path: [dirs.src + 'templates']
      }))
      .pipe(gulp.dest(dirs.build))
});

// Copies all libs needed at runtime to build
gulp.task('libs', function(){
    return gulp.src([
        dirs.src + 'js/lib/**/*'])
        .pipe(gulp.dest(dirs.build + 'js/lib'));
});

gulp.task('css', function() {
    gulp.src(['node_modules/bootstrap/**/*.css'])
        .pipe(gulp.dest(dirs.build + 'css/bootstrap/'));
    gulp.src(['node_modules/tether/**/*.css'])
        .pipe(gulp.dest(dirs.build + 'css/tether/'));
    return gulp.src([dirs.src + 'css/**/*'])
        .pipe(gulp.dest(dirs.build + 'css'));
});

// Copy images
gulp.task('img', function() {
    "use strict";
    return gulp.src([dirs.src + 'images/*.*'])
        .pipe(gulp.dest(dirs.build + 'images'));
});

gulp.task('watch', function() {
    gulp.watch(dirs.src + 'pages/**/*', ['nunjucks']);
    gulp.watch(dirs.src + 'templates/**/*', ['nunjucks']);
    gulp.watch(dirs.tsSrc + '*.ts', ['bundle-src']);
});

gulp.task('bundle-src', function () {
    const bundler = browserify({
        debug: true,
        entries: [dirs.tsSrc + 'main.ts'],
        cache: {},
        packageCache: {},
        fullPaths: true
    });

    LIBS.forEach(function(lib) {
        bundler.external(require.resolve(lib, { expose: lib }));
    });
    bundler
        .plugin(tsify)
        .bundle()
        .pipe(source('client.js'))
        .pipe(gulp.dest(dirs.jsOut));
    // Catch errors
    process.on('uncaughtException', gutil.log);
});

gulp.task("bundle-lib", function() {
    const bundler = browserify({
        debug: false
    });

    LIBS.forEach(function(lib) {
        bundler.require(lib);
    });

    bundler.bundle()
        .pipe(source("common.js"))
        .pipe(gulp.dest(dirs.jsOut));
});
gulp.task('bundle', ['bundle-lib', 'bundle-src']);
gulp.task('build', ['nunjucks', 'bundle', 'css', 'img']);
gulp.task('default', ['build', 'watch']);