var del = require('del');
var gulp = require('gulp');
var gulp_changed = require('gulp-changed');
var gulp_filter = require("gulp-filter");
var gulp_shell = require('gulp-shell');
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
    run_sequence('clean:server', callback);
});

gulp.task('purge', function(callback) {
    run_sequence('clean:server', 'clean:tsd', callback);
});

gulp.task('clean:server', function(callback) {
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

gulp.task('watch', ['build:server'], function() {
    return gulp.watch(locations.sources, configs.watcher, ['build:server:typescript', 'build:server:copy'])
        .on('change', function (event) {
            gulp_util.log("[" + gulp_util.colors.cyan("watch") + "]", 'File ' + event.path + ' was ' + event.type);
        });
});

////////
// Build
////////

gulp.task('build', function(callback) {
    run_sequence('build:server', callback);
});

gulp.task('build:server', ['build:tsd'], function(callback) {
    run_sequence('build:server:typescript', 'build:server:copy', callback);
});

gulp.task('build:server:copy', function() {
    var copyFilter = gulp_filter(locations.filters.copy);

    return gulp.src(locations.sources)
        .pipe(copyFilter)
        .pipe(gulp_changed(locations.output))
        .pipe(gulp.dest(locations.output));
});

var tsProject = gulp_typescript.createProject(configs.typescript);

gulp.task('build:server:typescript', function () {
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

gulp.task('build:test', ['build:tsd', 'build:server'], function(callback) {
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

gulp.task('build:tsd', function (callback) {
    return gulp_tsd(configs.tsd, callback);
});

//////
// Run
//////

gulp.task('start', ['build:server'], function(callback) {
    run_sequence('start:server', callback);
});

gulp.task('start:server', function() {
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
    run_sequence('deploy:heroku', callback);
});

gulp.task('deploy:heroku', ['build:server', 'test:run'], function() {
    var command = 'git push heroku `git subtree split --prefix server master`:master --force';
    gulp_util.log("[" + gulp_util.colors.cyan("deploy:heroku") + "]", 'Changing directory');
    process.chdir('..');
    gulp_util.log("[" + gulp_util.colors.cyan("deploy:heroku") + "]", 'Executing ' + command);
    return gulp.src('').pipe(gulp_shell([command]));
});

///////
// Test
///////

gulp.task('test', function(callback) {
    run_sequence('test:run', callback);
});

gulp.task('test:run', ['build:server', 'build:test'], function() {
    return gulp.src([locations.test])
        .pipe(gulp_spawn_mocha(configs.mocha));
});
