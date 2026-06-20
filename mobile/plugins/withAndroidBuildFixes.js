const { withAndroidManifest, withGradleProperties } = require('@expo/config-plugins');

function withAndroidBuildFixes(config) {
  // 1. Modify AndroidManifest.xml to ensure the tools:replace has its replacement value
  config = withAndroidManifest(config, (config) => {
    // Add the xmlns:tools namespace to manifest
    if (config.modResults.manifest) {
      config.modResults.manifest.$ = {
        ...config.modResults.manifest.$,
        'xmlns:tools': 'http://schemas.android.com/tools',
      };
    }

    const mainApplication = config.modResults.manifest.application[0];
    if (mainApplication) {
      mainApplication.$['tools:replace'] = 'android:appComponentFactory';
      mainApplication.$['android:appComponentFactory'] = 'androidx.core.app.CoreComponentFactory';
    }
    return config;
  });

  // 2. Modify gradle.properties to enable Jetifier and AndroidX
  config = withGradleProperties(config, (config) => {
    const properties = config.modResults;

    const setProperty = (key, value) => {
      const existing = properties.find((p) => p.key === key);
      if (existing) {
        existing.value = value;
      } else {
        properties.push({ type: 'property', key, value });
      }
    };

    setProperty('android.useAndroidX', 'true');
    setProperty('android.enableJetifier', 'true');

    return config;
  });

  return config;
}

module.exports = withAndroidBuildFixes;
