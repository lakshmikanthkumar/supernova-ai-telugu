const React = require('react');
const { View } = require('react-native');
const Camera = (props) => React.createElement(View, props);
Camera.requestCameraPermissionsAsync = jest.fn().mockResolvedValue({ granted: true, status: 'granted' });
Camera.getCameraPermissionsAsync = jest.fn().mockResolvedValue({ granted: true, status: 'granted' });
Camera.Constants = { Type: { back: 'back', front: 'front' }, FlashMode: { off: 'off', on: 'on' } };
module.exports = { Camera, CameraType: { back: 'back', front: 'front' } };
module.exports.default = Camera;
