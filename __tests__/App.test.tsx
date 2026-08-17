/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';

jest.mock('../firebase', () => ({
  db: {},
  registerUser: jest.fn(),
  loginUser: jest.fn(),
  signOut: jest.fn(),
  resetPassword: jest.fn(),
  subscribeToAuthChanges: jest.fn((callback) => {
    callback(null);
    return jest.fn();
  }),
  updateUserProfile: jest.fn(),
  deleteAccountAndData: jest.fn(),
}));

test('renders correctly', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });
});
