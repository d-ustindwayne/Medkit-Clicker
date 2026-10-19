// Lets `bun test` load game code: image, audio and font files become plain numbers, like Metro's asset ids.
Bun.plugin({
  name: "asset-stub",
  setup(build) {
    build.onLoad({ filter: /\.(png|jpg|mp3|m4a|ttf|otf)$/ }, () => ({ contents: "module.exports = 1;", loader: "js" }));
  },
});
