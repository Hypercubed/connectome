// Karma configuration
// http://karma-runner.github.io/0.10/config/configuration-file.html

module.exports = function(config) {
  config.set({
    // base path, that will be used to resolve files and exclude
    basePath: 'app',

    // testing framework to use (jasmine/mocha/qunit/...)
    frameworks: ['jasmine'],

    // list of files / patterns to load in the browser
    files: [
      'bower_components/jquery/dist/jquery.js',
      'bower_components/angular/angular.js',
      'bower_components/angular-mocks/angular-mocks.js',
      'bower_components/_F/_F.js',
      'bower_components/d3/d3.js',
      'components/charts/core.js',
      'bower_components/angular-sanitize/angular-sanitize.js',
      'bower_components/angular-loading-bar/src/loading-bar.js',
      'bower_components/angular-bootstrap/ui-bootstrap-tpls.js',
      'bower_components/angular-ui-router/release/angular-ui-router.js',
      'bower_components/ng-debounce/angular-debounce.js',
      //'bower_components/d3-plugins/hive/hive.js',
      //'bower_components/FileSaver/FileSaver.js',
      'bower_components/angular-downloadsvg-directive/angular-downloadsvg-directive.js',
      'bower_components/angular-growl/build/angular-growl.js',
      'bower_components/angular-animate/angular-animate.js',
      'bower_components/angular-slider-widget/angular-slider-widget.js',
      'bower_components/angular-local-storage/angular-local-storage.js',
      'bower_components/_F/_F.js',
      //'bower_components/lodash/dist/lodash.compat.js',
      'bower_components/angular-dsv/angular-dsv.js',
      'bower_components/angular-sanitize/angular-sanitize.js',
      'bower_components/angular-bindonce/bindonce.js',
      'bower_components/ng-context-menu/dist/ng-context-menu.js',
      'bower_components/ng-grid/build/ng-grid.js',
      //'bower_components/marked/lib/marked.js',
      'bower_components/angular-marked/angular-marked.js',
      //'bower_components/Blob.js/Blob.js',
      //'bower_components/chosen/chosen.jquery.js',
      'bower_components/angular-chosen-localytics/chosen.js',
      'bower_components/zeroclipboard/dist/ZeroClipboard.js',
      'bower_components/ng-clip/dest/ng-clip.min.js',
      'bower_components/ng-grid/plugins/ng-grid-flexible-height.js',
      'components/*.js',
      'components/**/*.js',
      //'test/mock/**/*.js',
      '../test/spec/**/*.js',
      {pattern: 'data/*.txt', watched: true, served: true, included: false}
    ],

    // list of files / patterns to exclude
    exclude: [],

    reporters: ['mocha'],

    // web server port
    port: 8080,

    // level of logging
    // possible values: LOG_DISABLE || LOG_ERROR || LOG_WARN || LOG_INFO || LOG_DEBUG
    logLevel: config.LOG_INFO,

    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: false,

    // Start these browsers, currently available:
    // - Chrome
    // - ChromeCanary
    // - Firefox
    // - Opera
    // - Safari (only Mac)
    // - PhantomJS
    // - IE (only Windows)
    browsers: ['PhantomJS'],

    // Continuous Integration mode
    // if true, it capture browsers, run tests and exit
    singleRun: false
  });
};
