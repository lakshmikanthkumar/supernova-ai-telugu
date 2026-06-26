module.exports = {
  Audio: {
    Sound: {
      createAsync: jest.fn().mockResolvedValue({
        sound: {
          playAsync: jest.fn().mockResolvedValue({}),
          stopAsync: jest.fn().mockResolvedValue({}),
          unloadAsync: jest.fn().mockResolvedValue({}),
          setOnPlaybackStatusUpdate: jest.fn(),
        },
        status: { isLoaded: true },
      }),
    },
    Recording: jest.fn().mockImplementation(() => ({
      prepareToRecordAsync: jest.fn().mockResolvedValue({}),
      startAsync: jest.fn().mockResolvedValue({}),
      stopAndUnloadAsync: jest.fn().mockResolvedValue({}),
      getURI: jest.fn().mockReturnValue('file://mock-recording.m4a'),
    })),
    requestPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
    setAudioModeAsync: jest.fn().mockResolvedValue({}),
    RecordingOptionsPresets: { HIGH_QUALITY: {} },
  },
  Video: 'Video',
};
