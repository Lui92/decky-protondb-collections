/**
 * Mock implementation of node-fetch for Jest tests
 */

const mockResponses: Record<string, any> = {};

const mockFetch = jest.fn(async (url: string, options?: any) => {
  // Return a mocked response if configured, otherwise simulate 404
  if (mockResponses[url]) {
    return mockResponses[url];
  }
  
  // Default: return 404 for any unconfigured URL
  return {
    ok: false,
    status: 404,
    statusText: 'Not Found',
    json: async () => ({ tier: 'Unknown' }),
  };
});

// Expose configure for tests
(mockFetch as any).setResponse = (url: string, response: any) => {
  mockResponses[url] = response;
};

(mockFetch as any).clearResponses = () => {
  Object.keys(mockResponses).forEach(key => delete mockResponses[key]);
  mockFetch.mockClear();
};

module.exports = mockFetch;
