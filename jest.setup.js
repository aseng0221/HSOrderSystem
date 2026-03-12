jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

jest.mock('@react-native-firebase/app', () => {
  return () => ({
    app: jest.fn(() => ({})),
  });
});

jest.mock('@react-native-firebase/auth', () => {
  const authMock = {
    onAuthStateChanged: jest.fn(),
    signInWithEmailAndPassword: jest.fn(),
    createUserWithEmailAndPassword: jest.fn(),
    signOut: jest.fn(),
  };
  return {
    __esModule: true,
    default: () => authMock,
    getAuth: jest.fn(() => authMock),
  };
});

jest.mock('@react-native-firebase/firestore', () => {
  const firestoreMock = {
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: jest.fn(() => Promise.resolve({exists: true, data: () => ({})})),
        set: jest.fn(),
        update: jest.fn(),
      })),
      onSnapshot: jest.fn(),
    })),
  };
  return {
    __esModule: true,
    default: () => firestoreMock,
    getFirestore: jest.fn(() => firestoreMock),
    collection: jest.fn(),
  };
});

jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(),
}));

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(),
  collection: jest.fn(),
  query: jest.fn(),
  orderBy: jest.fn(),
  onSnapshot: jest.fn(),
}));

jest.mock('react-native-geolocation-service', () => ({
  getCurrentPosition: jest.fn(),
  watchPosition: jest.fn(),
  clearWatch: jest.fn(),
  stopObserving: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('fiuu-mobile-xdk-reactnative', () => ({
  startMolpay: jest.fn(),
}));
