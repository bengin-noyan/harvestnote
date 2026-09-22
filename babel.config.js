module.exports = function (api) {
  api.cache(true);
  return {
    // Reanimated/worklets plugin'ini elle EKLEME. babel-preset-expo,
    // react-native-worklets kuruluysa onu kendisi ekliyor. Elle eklersen
    // "Duplicate plugin" hatasi aliyorsun (Reanimated 4 + SDK 57).
    presets: ['babel-preset-expo'],
  };
};
