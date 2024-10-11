
const { useMinecraftPreview, minify, BPName, RPName } = require("./cbconfig.json");

const gulp = require("gulp");
const del = require("del");
const os = require("os");
const spawn = require("child_process").spawn;

const esbuild = require("gulp-esbuild");
const ignorePlugin = require("esbuild-plugin-ignore");
const nodePolyfill = require("esbuild-plugin-polyfill-node");
const gZip = require("gulp-zip");
const merge = require("merge-stream");

let package = false;

const mcdir = os.homedir() + (useMinecraftPreview
      //Change this if not building on windows
      ? "/AppData/Local/Packages/Microsoft.MinecraftWindowsBeta_8wekyb3d8bbwe/LocalState/games/com.mojang/"
      : "/AppData/Local/Packages/Microsoft.MinecraftUWP_8wekyb3d8bbwe/LocalState/games/com.mojang/")


// the overwrite: true is important because quick_copy doesnt clean before deploying
function copy_behavior_packs() {
  return gulp.src(["behavior_packs/**/*"]).pipe(gulp.dest(mcdir + "development_behavior_packs/", { overwrite: true }));
}

function copy_resource_packs() {
  return gulp.src(["resource_packs/**/*"]).pipe(gulp.dest(mcdir + "development_resource_packs/", { overwrite: true }));
}

const copy_content = gulp.parallel(copy_behavior_packs, copy_resource_packs);

function compile_scripts() {
  return gulp
    .src("./scripts/main.ts")
    .pipe(
      esbuild({
        outdir: "./scripts/",
        bundle: true,
        format: "esm",
        platform: "neutral",
        packages: undefined,
        sourcemap: package ? undefined : "external",
        minify: minify,
        loader: {
          ".ts": "ts",
          ".md": "empty",
        },
        external: ["@minecraft/server", "@minecraft/server-ui"],
        mainFields: ["main", "module"],
        plugins: [
          nodePolyfill.polyfillNode({
            polyfills: {
              buffer: true,
              process: true,
              stream: true,
              _stream_readable: true,
              _stream_writable: true,
              _stream_transform: true,
              _stream_duplex: true,
              _stream_passthrough: true,
              console: false,
              crypto: true,
              events: true
            },
            globals: {
              process: true,
              global: true,
              buffer: true,
              navigator: true,
            },
          }),
          ignorePlugin([
            {
              resourceRegExp:/\/ssb\//
            },
            {
              resourceRegExp:/cg_teams\.ts/
            }
          ])
        ],
      })
    )
    .pipe(gulp.dest(mcdir + "development_behavior_packs/" + BPName, { overwrite: true }));
}

const build = gulp.series(clean_localmc, copy_content, compile_scripts, copyToSourceFolder);

/** This seems pointless but is necessary for the bedrock debugger to navigate the typescript source code properly */
function copyToSourceFolder() {
  return gulp.src(mcdir + "development_behavior_packs/" + BPName + "/scripts/*")
    .pipe(gulp.dest("scripts/"));
}

function clean_localmc(callbackFunction) {
  if (!BPName || !BPName.length || BPName.length < 2) {
    console.log("No bpfoldername specified.");
    callbackFunction();
    return;
  }

  del([mcdir + "development_behavior_packs/" + BPName, mcdir + "development_resource_packs/" + RPName], {
    force: true,
  }).then(
    (value) => {
      callbackFunction(); // Success
    },
    (reason) => {
      callbackFunction(); // Error
    }
  );
}

//Creates an mcaddon file ready to be distributed
//TODO: This only works if one resource pack is in the folder
function package_build() {
  return merge([
    gulp.src([mcdir + "development_resource_packs/" + RPName + "/**/*"]).pipe(gZip("CobblemonBedrock.mcpack")),
    gulp.src([mcdir + "development_behavior_packs/" + BPName + "/**/*"]).pipe(gZip("CobblemonBedrock.mcpack")),
  ])
    .pipe(gZip("Cobblemon.mcaddon"))
    .pipe(gulp.dest("dist/"));
}

function watch() {
  return gulp.watch(
    ["scripts/**/*.ts", "behavior_packs/**/*", "resource_packs/**/*"],
    gulp.series(build)
  );
}

function watch_scripts() {
  return gulp.watch(["scripts/**/*.ts"], gulp.series(compile_scripts, copyToSourceFolder));
}

exports.copy_behavior_packs = copy_behavior_packs;
exports.copy_resource_packs = copy_resource_packs;
exports.release = gulp.series(() => { package = true; minify = true; },build, package_build);
exports.compile_scripts = compile_scripts;
exports.copy_content = copy_content;
exports.build = build;
exports.clean_localmc = clean_localmc;
exports.default = build
exports.clean = gulp.series(clean_localmc);
exports.watch = gulp.series(build, watch);
exports.watch_scripts = watch_scripts;
//TODO: These only copy to development_behavior_packs
exports.quick_pack = copy_content;
exports.quick_scripts = gulp.series(compile_scripts, copyToSourceFolder);
