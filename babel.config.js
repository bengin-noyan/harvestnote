module.exports = function (api) {
  api.cache(true);
  return {
    // Reanimated/worklets eklentisi ELLE eklenmiyor: babel-preset-expo,
    // react-native-worklets kuruluysa plugin'i kendisi ekliyor. Manuel
    // eklemek "Duplicate plugin" hatasi veriyor (Reanimated 4 + SDK 57).
    presets: ['babel-preset-expo'],
  };
};
