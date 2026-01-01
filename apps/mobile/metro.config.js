const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

config.watcher = {
  ...(config.watcher || {}),
  watchman: false,
};

module.exports = config;
