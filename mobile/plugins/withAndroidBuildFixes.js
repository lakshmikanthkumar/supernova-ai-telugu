const { withAndroidManifest, withGradleProperties } = require('@expo/config-plugins');

function withAndroidBuildFixes(config) {
  // 1. Modify AndroidManifest.xml to ensure the tools:replace has its replacement value and add <queries> for speech recognition visibility
  config = withAndroidManifest(config, (config) => {
    // Add the xmlns:tools namespace to manifest
    if (config.modResults.manifest) {
      config.modResults.manifest.$ = {
        ...config.modResults.manifest.$,
        'xmlns:tools': 'http://schemas.android.com/tools',
      };

      // Ensure queries list exists for package visibility (Android 11+)
      if (!config.modResults.manifest.queries) {
        config.modResults.manifest.queries = [];
      }
      
      let queries = config.modResults.manifest.queries[0];
      if (!queries) {
        queries = { intent: [] };
        config.modResults.manifest.queries.push(queries);
      }
      if (!queries.intent) {
        queries.intent = [];
      }

      // Check if android.speech.RecognitionService intent query already exists
      const hasSpeechRecognitionQuery = queries.intent.some((intent) => {
        return intent.action && intent.action.some((action) => {
          return action.$ && action.$['android:name'] === 'android.speech.RecognitionService';
        });
      });

      if (!hasSpeechRecognitionQuery) {
        queries.intent.push({
          action: [
            {
              $: {
                'android:name': 'android.speech.RecognitionService',
              },
            },
          ],
        });
      }
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