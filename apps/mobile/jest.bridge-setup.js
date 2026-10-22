global.__fbBatchedBridgeConfig = global.__fbBatchedBridgeConfig ?? {
  remoteModuleConfig: [
    [
      "SourceCode",
      { scriptURL: "http://localhost:8081/index.bundle?platform=ios" },
      [],
      [],
      []
    ],
    [
      "PlatformConstants",
      {
        forceTouchAvailable: false,
        interfaceIdiom: "phone",
        isTesting: true,
        osVersion: "17.0",
        reactNativeVersion: { major: 0, minor: 81, patch: 5, prerelease: null },
        systemName: "iOS"
      },
      [],
      [],
      []
    ],
    [
      "DeviceInfo",
      {
        Dimensions: {
          window: { width: 390, height: 844, scale: 3, fontScale: 1 },
          screen: { width: 390, height: 844, scale: 3, fontScale: 1 }
        },
        isIPhoneX_deprecated: false,
        isIPhoneXr_deprecated: false
      },
      [],
      [],
      []
    ],
    [
      "UIManager",
      {
        RCTRawText: { NativeProps: {} },
        RCTScrollView: { NativeProps: {} },
        RCTText: { NativeProps: {} },
        RCTView: { NativeProps: {} },
        ScrollView: { NativeProps: {} },
        View: { NativeProps: {} }
      },
      [
        "blur",
        "createView",
        "dispatchViewManagerCommand",
        "focus",
        "manageChildren",
        "measure",
        "measureInWindow",
        "measureLayout",
        "setChildren",
        "updateView"
      ],
      [],
      []
    ],
    ["Appearance", { colorScheme: "dark" }, ["addListener", "removeListeners"], [], []],
    ["AppState", { initialAppState: "active" }, ["addListener", "removeListeners"], [], []],
    ["DevSettings", {}, ["addListener", "removeListeners", "reload"], [], []],
    ["KeyboardObserver", {}, ["addListener", "removeListeners"], [], []],
    ["LinkingManager", {}, ["addListener", "removeListeners", "openURL", "canOpenURL"], [], []],
    ["ModalManager", {}, ["addListener", "removeListeners"], [], []],
    ["NativeAnimatedModule", {}, ["addListener", "removeListeners"], [], []],
    ["Networking", {}, ["addListener", "removeListeners"], [], []],
    ["Timing", {}, ["createTimer", "deleteTimer", "setSendIdleEvents"], [], []],
    [
      "BlobModule",
      {},
      [
        "addListener",
        "addNetworkingHandler",
        "addWebSocketHandler",
        "createFromParts",
        "release",
        "removeListeners",
        "removeNetworkingHandler",
        "removeWebSocketHandler",
        "sendOverSocket"
      ],
      [],
      []
    ],
    ["FileReaderModule", {}, ["readAsDataURL", "readAsText"], [], []],
    ["WebSocketModule", {}, ["addListener", "removeListeners"], [], []]
  ],
  localModulesConfig: []
};

jest.doMock("react-native/Libraries/EventEmitter/NativeEventEmitter", () => {
  return class NativeEventEmitter {
    addListener() {
      return { remove: jest.fn() };
    }

    emit() {}

    removeAllListeners() {}

    removeListener() {}
  };
});
