import '@testing-library/jest-dom'

// jsdom does not implement matchMedia. ThemeProvider uses it to resolve the
// 'system' theme, so component tests need a minimal stub.
if (!window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })
}
