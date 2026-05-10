const { withProjectBuildGradle } = require("@expo/config-plugins");

module.exports = (config) => {
  return withProjectBuildGradle(config, (config) => {
    if (config.modResults.contents) {
      // 1. Ganti semua http jcenter menjadi https secara global
      config.modResults.contents = config.modResults.contents.replace(
        /http:\/\/jcenter\.bintray\.com/g,
        "https://jcenter.bintray.com"
      );

      // 2. Injeksi aturan allowInsecureProtocol ke dalam blok repositories
      // Ini menangani kasus jika library tersebut tetap memaksa menggunakan http
      const insecureRepoSnippet = `
        maven {
            url "http://jcenter.bintray.com/"
            allowInsecureProtocol = true
        }
      `;

      // Mencari setiap blok repositories { ... } dan menambahkan snippet di atas
      config.modResults.contents = config.modResults.contents.replace(
        /repositories\s*\{/g,
        `repositories {
        ${insecureRepoSnippet}`
      );
    }
    return config;
  });
};
