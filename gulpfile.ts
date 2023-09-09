const gulp = require('gulp')
const ts = require('gulp-typescript');
const webpack = require('webpack')
const webpackConfig = require('./webpack.config.js')

const project = ts.createProject('tsconfig.json')

gulp.task('runWebpack', ()=>{
  return new Promise<void>((resolve, reject) => {
    webpack(webpackConfig, (err, stats) => {
        if (err) {
            return reject(err)
        }
        if (stats.hasErrors()) {
            return reject(new Error(stats.compilation.errors.join('\n')))
        }
        resolve()
    })
  })
});

gulp.task('compile', () => {
  return gulp.src('src/**/*.ts')
    .pipe(project())
    .pipe(gulp.dest('dist/'))
})

gulp.task('copy', async () => {
    gulp.src('README.md').pipe(gulp.dest("dist/"))
    gulp.src("src/module.json").pipe(gulp.dest('dist/'))
    gulp.src("src/lang/**").pipe(gulp.dest('dist/lang/'))
    gulp.src("src/templates/**").pipe(gulp.dest('dist/templates/'))
    gulp.src("src/styles/**").pipe(gulp.dest('dist/styles/'))
    gulp.src("src/assets/**").pipe(gulp.dest('dist/assets/'))
})

gulp.task('build', gulp.parallel('runWebpack', 'copy'));


// This is supposed to copy the dist folder into the modules directory for testing. Only works if you're relative path is exactly correct
// TODO make this less horribly brittle
const MODULEPATH = "../../AppData/Local/FoundryVTT/Data/modules/foundry-redirect/"
gulp.task('foundry', () => {
  return gulp.src('dist/**').pipe(gulp.dest(MODULEPATH))
})
gulp.task("update", gulp.series('build', 'foundry'))
