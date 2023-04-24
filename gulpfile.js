import gulp from 'gulp';

import del from 'del';
import through from 'through2';
import rename from 'gulp-rename';
import browserSync from 'browser-sync';

// SCSS
import sass from 'sass';
import gulpScss from 'gulp-sass';
import cleanCSS from 'gulp-clean-css';
import autoprefixer from 'gulp-autoprefixer';

// HTML
import gulpFileInclude from 'gulp-file-include';

// JS
import uglify from 'gulp-uglify';
import browserify from 'browserify';
import babelify from 'babelify';
import source from 'vinyl-source-stream';
import buffer from 'vinyl-buffer';

// FONTS
import ttf2woff from 'gulp-ttf2woff';
import ttf2woff2 from 'gulp-ttf2woff2';

// IMAGES
import imagemin, {gifsicle, mozjpeg, optipng, svgo} from 'gulp-imagemin';
import svgSprite from 'gulp-svg-sprite';
import webp from 'gulp-webp';
import newer from 'gulp-newer';

const scss = gulpScss(sass);
const isProduction = process.argv.includes('--production');

const path = {
    "src": {
        "html": "./src/*.html",
        "scss": "./src/scss/*.scss",
        "js": "./src/js/**/*.js",
        "fonts": "./src/fonts/*.ttf",
        "img": {
            "pictures": "./src/images/**/*.{png,jpg,jpeg,gif,svg}",
            "svg": "./src/images/sprites/**/*.svg"
        }
    },
    "dist": {
        "base": "./dist",
        "scss": "./dist/css",
        "js": "./dist/js",
        "fonts": "./dist/fonts",
        "images": "./dist/images"
    }
}

const clean = () => {
    return del('dist');
}

const noop = () => {
    return through.obj();
}

const html = () => {
    return gulp.src(path.src.html)
        .pipe(gulpFileInclude())
        .pipe(gulp.dest(path.dist.base))
        .pipe(browserSync.stream())
}

const styles = () => {
    return gulp.src(path.src.scss)
        .pipe(scss())
        .pipe(isProduction ? autoprefixer( { cascade: false } ) : noop() )
        .pipe(gulp.dest(path.dist.scss))
        .pipe(isProduction ? cleanCSS() : noop())
        .pipe(rename( { suffix: '.min' } ))
        .pipe(gulp.dest(path.dist.scss))
        .pipe(browserSync.stream())
}

const scripts = () => {
    return browserify({
        entries: './src/js/script.js',
        debug: true,
        transform: [babelify.configure()]
    })
    .bundle()
    .pipe(source('script.js'))
    .pipe(buffer())
    .pipe(gulp.dest(path.dist.js))
    .pipe(isProduction ? uglify() : noop())
    .pipe(rename( { suffix: '.min' } ))
    .pipe(gulp.dest(path.dist.js))
    .pipe(browserSync.stream())
}

const convertWoff = () => {
    return gulp.src(path.src.fonts)
        .pipe(ttf2woff())
        .pipe(gulp.dest(path.dist.fonts))
}

const convertWoff2 = () => {
    return gulp.src(path.src.fonts)
        .pipe(ttf2woff2())
        .pipe(gulp.dest(path.dist.fonts))
}

const convertTtf = () => {
    return gulp.src(path.src.fonts)
        .pipe(gulp.dest(path.dist.fonts))
}

const images = () => {
    return gulp.src(path.src.img.pictures, { base: 'src' })
        .pipe(isProduction ? newer(path.dist.images) : noop())
        .pipe(isProduction ? imagemin([
            gifsicle({ interlaced: true }),
            mozjpeg({ quality: 70, progressive: true }),
            optipng({ optimizationLevel: 5 }),
            svgo({
                plugins: [
                    {
                        name: 'removeViewBox',
                        active: true
                    },
                    {
                        name: 'cleanupIDs',
                        active: false
                    }
                ]
            })
        ]) : noop())
        .pipe(gulp.dest(path.dist.base))
        .pipe(isProduction ? webp() : noop())
        .pipe(gulp.dest(path.dist.base))
}

const svg = () => {
    return gulp.src(path.src.img.svg, { base: 'src' })
        .pipe(svgSprite({
            mode: {
                symbol: {
                    sprite: '../sprite.svg'
                }
            }
        }))
        .pipe(gulp.dest(path.dist.images))
}

const watcher = () => {
    gulp.watch(path.src.html, html);
    gulp.watch(path.src.scss, styles);
    gulp.watch(path.src.js, scripts);
    gulp.watch(path.src.fonts, convertWoff);
    gulp.watch(path.src.fonts, convertWoff2);
    gulp.watch(path.src.fonts, convertTtf);
    gulp.watch(path.src.img.pictures, images);
    gulp.watch(path.src.img.svg, svg);
}

const serve = () => {
    browserSync.init({
        server: {
            baseDir: path.dist.base
        },
        port: 3000
    });

    gulp.watch(path.src.html).on('change', browserSync.reload);
    gulp.watch(path.src.scss).on('change', browserSync.reload);
    gulp.watch(path.src.js).on('change', browserSync.reload);
    gulp.watch(path.src.fonts).on('change', browserSync.reload);
    gulp.watch(path.src.img.pictures).on('change', browserSync.reload);
    gulp.watch(path.src.img.svg).on('change', browserSync.reload);
}

const fonts = gulp.parallel(convertWoff, convertWoff2, convertTtf);
const imagesConvert = gulp.series(images, svg);

const build = gulp.series(clean, gulp.parallel(html, styles, scripts, fonts, imagesConvert));

export default gulp.series(build, gulp.parallel(watcher, serve));