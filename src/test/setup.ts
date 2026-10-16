import "@testing-library/jest-dom";

if (typeof window !== "undefined") {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => {},
    }),
  });
  if (!URL.createObjectURL) {
    Object.defineProperty(URL, "createObjectURL", {
      writable: true,
      value: () => "blob:test-url",
    });
  }
  if (!URL.revokeObjectURL) {
    Object.defineProperty(URL, "revokeObjectURL", {
      writable: true,
      value: () => {},
    });
  }
}
