export const NativeModules = {
  PlatformConstants: {
    reactNativeVersion: { major: 0, minor: 0, patch: 0 },
  },
};

export const Platform = {
  OS: "ios",
  select<T>(options: { ios?: T; android?: T; default?: T }) {
    if (this.OS === "ios" && options.ios !== undefined) {
      return options.ios;
    }
    if (this.OS === "android" && options.android !== undefined) {
      return options.android;
    }
    return options.default;
  },
};

export default {
  NativeModules,
  Platform,
};
