jest.mock('@expo/vector-icons/Ionicons', () => {
  const React = require('react');
  return function MockIonicons(props) {
    return React.createElement('Ionicons', props);
  };
});

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    SafeAreaProvider: ({ children }) => React.createElement(React.Fragment, null, children),
    SafeAreaView: ({ children, ...props }) => React.createElement(View, props, children),
    initialWindowMetrics: null,
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 })
  };
});
