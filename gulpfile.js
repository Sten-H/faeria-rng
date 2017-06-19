// Gulp.js configuration
var
  // modules
  gulp = require('gulp'),
  nunjucksRender = require('gulp-nunjucks-render'),
  data = require('gulp-data'),

  // development mode?
  devBuild = (process.env.NODE_ENV !== 'production')
;
gulp.task('nunjucks', function() {
  return gulp.src('./app/pages/**/*.+(html|nunjucks)')
      // Adding data to Nunjucks
      .pipe(data(function() {
          return require('./app/data.json')
      }))
      .pipe(nunjucksRender({
          path: ['./app/templates']
      }))
      .pipe(gulp.dest('app'))
});

// watch for changes
gulp.task('watch', function() {
    // nunjuck changes
    gulp.watch('./app/pages/**/*', ['nunjucks']);
    gulp.watch('./app/templates/**/*', ['nunjucks']);
});

gulp.task('run', ['nunjucks']);
gulp.task('default', ['run', 'watch']);