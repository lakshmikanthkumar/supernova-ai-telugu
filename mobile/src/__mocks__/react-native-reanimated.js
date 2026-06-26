// Mock for react-native-reanimated in Jest
const Reanimated = require('react-native-reanimated/mock');
Reanimated.default.call = () => {};
module.exports = Reanimated;
