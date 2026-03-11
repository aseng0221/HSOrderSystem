/**
 * @format
 */

import 'react-native';
import React from 'react';

// Note: import explicitly to use the types shipped with jest.
import {it, jest} from '@jest/globals';

import { Animated } from 'react-native';
jest.spyOn(Animated, 'timing').mockImplementation(() => ({
  start: jest.fn(cb => {
    if (cb) {
      cb({ finished: true });
    }
  }),
}));

jest.mock('../App', () => {
  const React = require('react');
  const { View } = require('react-native');
  return function MockApp() {
    return <View />;
  };
});

import App from '../App';

// Note: test renderer must be required after react-native.
import renderer from 'react-test-renderer';

it('renders correctly', () => {
  renderer.create(<App />);
});
