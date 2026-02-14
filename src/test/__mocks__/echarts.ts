const mockEchartsInstance = {
  setOption: jest.fn(),
  resize: jest.fn(),
  dispose: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  getWidth: jest.fn(() => 800),
  getHeight: jest.fn(() => 600),
  getDom: jest.fn(() => document.createElement('div')),
  clear: jest.fn(),
  isDisposed: jest.fn(() => false),
  showLoading: jest.fn(),
  hideLoading: jest.fn(),
};

export const init = jest.fn(() => mockEchartsInstance);
export const use = jest.fn();
export const registerTheme = jest.fn();
export const getInstanceByDom = jest.fn(() => mockEchartsInstance);

export default {
  init,
  use,
  registerTheme,
  getInstanceByDom,
};
