import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { Container } from 'typedi';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  clear: vi.fn()
};
global.localStorage = localStorageMock;

// Reset Container between tests
beforeEach(() => {
  Container.reset();
});

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks();
}); 