// Gulp.js configuration
const
    gulp = require('gulp'),
    nunjucksRender = require('gulp-nunjucks-render'),
    data = require('gulp-data'),
    ts = require("gulp-typescript"),
    tsProject = ts.createProject("tsconfig.json"),
    browserify = require("browserify"),
    source = require('vinyl-source-stream'),
    tsify = require("tsify"),
    devBuild = (process.env.NODE_ENV !== 'production');  // development mode?
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

// watch for changes
gulp.task('watch', function() {
    // nunjuck changes
    gulp.watch(dirs.src + 'pages/**/*', ['nunjucks']);
    gulp.watch(dirs.src + 'templates/**/*', ['nunjucks']);
    // gulp.watch(dirs.tsSrc + '*.ts', ['ts']);
});

// Compile typescript from entry point and bundle into one js file
gulp.task("ts", function () {
    return browserify({
        basedir: '.',
        debug: true,
        entries: [dirs.tsSrc + 'main.ts'],
        cache: {},
        packageCache: {}
    })
        .plugin(tsify)
        .bundle()
        .pipe(source('bundle.js'))
        .pipe(gulp.dest(dirs.jsOut));
});
gulp.task('build', ['nunjucks', 'ts', 'css', 'libs', 'img']);
gulp.task('default', ['build', 'watch']);
