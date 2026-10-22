class MockNativeEventEmitter {
  addListener() {
    return { remove: jest.fn() };
  }

  emit() {}

  removeAllListeners() {}

  removeListener() {}
}

module.exports = MockNativeEventEmitter;
module.exports.default = MockNativeEventEmitter;
