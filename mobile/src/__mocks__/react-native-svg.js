const React = require('react');
const { View } = require('react-native');
const mock = (name) => {
  const Comp = (props) => React.createElement(View, props);
  Comp.displayName = name;
  return Comp;
};
module.exports = {
  default: mock('Svg'),
  Svg: mock('Svg'),
  Circle: mock('Circle'),
  Ellipse: mock('Ellipse'),
  G: mock('G'),
  Text: mock('Text'),
  TSpan: mock('TSpan'),
  TextPath: mock('TextPath'),
  Path: mock('Path'),
  Polygon: mock('Polygon'),
  Polyline: mock('Polyline'),
  Line: mock('Line'),
  Rect: mock('Rect'),
  Use: mock('Use'),
  Image: mock('Image'),
  Symbol: mock('Symbol'),
  Defs: mock('Defs'),
  LinearGradient: mock('LinearGradient'),
  RadialGradient: mock('RadialGradient'),
  Stop: mock('Stop'),
  ClipPath: mock('ClipPath'),
  Pattern: mock('Pattern'),
  Mask: mock('Mask'),
};
