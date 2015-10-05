var del = require('del');
var gulp = require('gulp');
var gulp_angular_filesort = require('gulp-angular-filesort');
var gulp_bower = require('gulp-bower');
var gulp_changed = require('gulp-changed');
var gulp_filter = require("gulp-filter");
var gulp_gh_pages = require('gulp-gh-pages');
var gulp_inject = require('gulp-inject');
var gulp_spawn_mocha = require('gulp-spawn-mocha');
var gulp_tsd = require('gulp-tsd');
var gulp_typescript = require('gulp-typescript');
var gulp_util = require('gulp-util');
var gulp_nodemon = require('gulp-nodemon');
var run_sequence = require('run-sequence');

var configs = {
    inject : {
        angular: {
            starttag: '<!-- inject:angular:{{ext}} -->',
            ignorePath: 'app/',
            addRootSlash: false
        }
    },

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

    inject: {
        dest: 'app',
        src: 'src/index.html',
        angular: ['app/**/*.js', '!app/app.js', '!app/**/*.spec.js', '!app/bower_components/**/*']
    },

    filters: {
        copy: ['**/*.{html,css,json}'],
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
    run_sequence('clean:client', callback);
});

gulp.task('purge', function(callback) {
    run_sequence('clean:client', 'clean:tsd', callback);
});

gulp.task('clean:client', function(callback) {
    del([locations.output + '/*'], callback);
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

gulp.task('watch', ['build:client'], function() {
    return gulp.watch(locations.sources, configs.watcher, ['build:client:typescript', 'build:client:copy'])
        .on('change', function (event) {
            gulp_util.log("[" + gulp_util.colors.cyan("watch") + "]", 'File ' + event.path + ' was ' + event.type);
        });
});

////////
// Build
////////

gulp.task('build', function(callback) {
    run_sequence('build:client', callback);
});

gulp.task('build:client', ['build:tsd', 'build:bower'], function(callback) {
    run_sequence('build:client:typescript', 'build:client:copy', 'build:inject', callback);
});

gulp.task('build:client:copy', function() {
    var copyFilter = gulp_filter(locations.filters.copy);

    return gulp.src(locations.sources)
        .pipe(copyFilter)
        .pipe(gulp_changed(locations.output))
        .pipe(gulp.dest(locations.output));
});

var tsProject = gulp_typescript.createProject(configs.typescript);

gulp.task('build:client:typescript', function () {
    var tsFilter = gulp_filter(locations.filters.typescript); // non-test TypeScript files

    var errors = null;
    var tsResult = gulp.src(locations.sources)
        .pipe(gulp_changed(locations.output, {extension: '.js'}))
        .pipe(tsFilter)
        .pipe(gulp_typescript(tsProject))
        .on('error', function(error) {
            errors = error;
        })
        .on('end', function() {
            if (errors) {
                throw errors;
            }
        });

    return tsResult.js.pipe(gulp.dest(locations.output));
});

gulp.task('build:test', ['build:tsd', 'build:client'], function(callback) {
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

gulp.task('build:inject', function(callback) {
    run_sequence('build:inject:angular', callback);
});

gulp.task('build:inject:angular', function() {
    return gulp.src(locations.inject.src)
        .pipe(gulp_inject(gulp.src(locations.inject.angular).pipe(gulp_angular_filesort()), configs.inject.angular))
        .pipe(gulp.dest(locations.inject.dest));
});

//////
// Run
//////

gulp.task('start', ['build:client'], function(callback) {
    run_sequence('start:client', callback);
});

gulp.task('start:client', function() {
    gulp_nodemon({
        script: locations.start,
        env: {
            NODE_ENV: process.env.NODE_ENV || 'development',
            NODE_CONFIG_DIR: 'app/config'
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

gulp.task('deploy:ghpages', ['build:client', 'test:run'], function() {
    return gulp.src(locations.deploy)
        .pipe(gulp_gh_pages());
});

///////
// Test
///////

gulp.task('test', function(callback) {
    run_sequence('test:run', callback);
});

gulp.task('test:run', ['build:client', 'build:test'], function() {
    return gulp.src([locations.test])
        .pipe(gulp_spawn_mocha(configs.mocha));
});
