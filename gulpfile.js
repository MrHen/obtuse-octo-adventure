var del = require('del');
var gulp = require('gulp');
var gulp_bower = require('gulp-bower');
var gulp_changed = require('gulp-changed');
var gulp_gh_pages = require('gulp-gh-pages');
var gulp_filter = require("gulp-filter");
var gulp_spawn_mocha = require('gulp-spawn-mocha');
var gulp_tsd = require('gulp-tsd');
var gulp_typescript = require('gulp-typescript');
var gulp_util = require('gulp-util');
var gulp_nodemon = require('gulp-nodemon');
var run_sequence = require('run-sequence');

var configs = {
    mocha: {},

    tsd: {
        command: 'reinstall',
        config: 'tsd.json'
    },

    typescript: {
        noImplicitAny: true,
        noEmitOnError: true,
        module: 'commonjs',
        target: 'ES5'
    },

    watcher: {
        interval: 1000
    }
};

var locations = {
    sources: "src/**/*",

    output: "app",
    test: "app/**/*.spec.js",
    deploy: "app/**/*",
    start: "app/app.js",
    bower: "app/bower_components",

    filters: {
        copy: ['**/*.{html,css}'],
        typescript: ['**/*.ts', '!**/*.spec.ts']
    },

    watch: {
        restart: ["app/**/*"]
    }
};

////////
// Clean
////////

gulp.task('clean', function(callback) {
    run_sequence('clean:app', callback);
});

gulp.task('purge', function(callback) {
    run_sequence('clean:app', 'clean:tsd', callback);
});

gulp.task('clean:app', function(callback) {
    del(['app/*'], callback);
});

gulp.task('clean:deploy', function(callback) {
    del(['.publish/*'], callback);
});

gulp.task('clean:tsd', function (callback) {
    del(['typings/*'], callback);
});

////////
// Watch
////////

gulp.task('watch', ['build:app'], function() {
    return gulp.watch(locations.sources, configs.watcher, ['build:app:typescript', 'build:app:copy'])
        .on('change', function (event) {
            gulp_util.log("[" + gulp_util.colors.cyan("watch") + "]", 'File ' + event.path + ' was ' + event.type);
        });
});

////////
// Build
////////

gulp.task('build', function(callback) {
    run_sequence('build:app', callback);
});

gulp.task('build:app', ['build:tsd', 'build:bower'], function(callback) {
    run_sequence('build:app:typescript', 'build:app:copy', callback);
});

gulp.task('build:app:copy', function() {
    var copyFilter = gulp_filter(locations.filters.copy);

    return gulp.src(locations.sources)
        .pipe(copyFilter)
        .pipe(gulp_changed(locations.output))
        .pipe(gulp.dest(locations.output));
});

var tsProject = gulp_typescript.createProject(configs.typescript);

gulp.task('build:app:typescript', function () {
    var tsFilter = gulp_filter(locations.filters.typescript); // non-test TypeScript files

    var tsResult = gulp.src(locations.sources)
        .pipe(gulp_changed(locations.output, {extension: '.js'}))
        .pipe(tsFilter)
        .pipe(gulp_typescript(tsProject));

    return tsResult.js.pipe(gulp.dest(locations.output));
});

gulp.task('build:test', ['build:tsd', 'build:app'], function(callback) {
    run_sequence('build:test:typescript', callback);
});

gulp.task('build:test:typescript', function () {
    var tsTestFilter = gulp_filter('**/*.spec.ts');

    var errors = false;
    var tsResult = gulp.src(locations.sources)
        .pipe(tsTestFilter)
        .pipe(gulp_typescript(configs.typescript))
        .on('error', function() {
            errors = true;
        })
        .on('end', function() {
            if (errors) {
                process.exit(1);
            }
        });

    return tsResult.js.pipe(gulp.dest(locations.output));
});

gulp.task('build:bower', function () {
    return gulp_bower().pipe(gulp.dest(locations.bower));
});

gulp.task('build:tsd', function (callback) {
    return gulp_tsd(configs.tsd, callback);
});

//////
// Run
//////

gulp.task('start', ['build:app'], function(callback) {
    run_sequence('start:app', callback);
});

gulp.task('start:app', function() {
    gulp_nodemon({
        script: locations.start,
        env: {
            NODE_ENV: process.env.NODE_ENV
        },
        watch: locations.watch.restart,
        verbose: true
    });
});

/////////
// Deploy
/////////

gulp.task('deploy', function(callback) {
    run_sequence('deploy:ghpages', callback);
});

gulp.task('deploy:ghpages', ['build:app', 'test:run'], function() {
    return gulp.src(locations.deploy)
        .pipe(gulp_gh_pages());
});

///////
// Test
///////

gulp.task('test', function(callback) {
    run_sequence('test:run', callback);
});

gulp.task('test:run', ['build:app', 'build:test'], function() {
    return gulp.src([locations.test])
        .pipe(gulp_spawn_mocha(configs.mocha));
});
