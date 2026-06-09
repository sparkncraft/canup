import { describe, test, expect, vi } from 'vitest';

const { mockLoadProjectConfig } = vi.hoisted(() => ({ mockLoadProjectConfig: vi.fn() }));
const { mockLoadApiKey } = vi.hoisted(() => ({ mockLoadApiKey: vi.fn() }));
const { mockError, mockHint } = vi.hoisted(() => ({ mockError: vi.fn(), mockHint: vi.fn() }));
const { mockCanupClient, fakeClient } = vi.hoisted(() => {
  const fakeClient = {};
  return {
    mockCanupClient: vi.fn(function () {
      return fakeClient;
    }),
    fakeClient,
  };
});

vi.mock('./project-config.js', () => ({ loadProjectConfig: mockLoadProjectConfig }));
vi.mock('../auth/token-store.js', () => ({ loadApiKey: mockLoadApiKey }));
vi.mock('../ui/output.js', () => ({ error: mockError, hint: mockHint }));
vi.mock('../api-client.js', () => ({ CanupClient: mockCanupClient }));

import { requireProject, requireClient } from './require-project.js';

describe('requireProject', () => {
  test('exits with 1 when no project config is found', () => {
    using exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit');
    });
    mockLoadProjectConfig.mockReturnValue(null);

    expect(() => requireProject()).toThrow('process.exit');
    expect(mockError).toHaveBeenCalledWith(expect.stringContaining('No CanUp project'));
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  test('exits with 1 when no API key is found', () => {
    using exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit');
    });
    mockLoadProjectConfig.mockReturnValue({
      config: { appId: 'app-1' },
      projectRoot: '/root',
      canupDir: '/root/canup',
    });
    mockLoadApiKey.mockReturnValue(null);

    expect(() => requireProject()).toThrow('process.exit');
    expect(mockError).toHaveBeenCalledWith(expect.stringContaining('No API key'));
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  test('returns config, apiKey, projectRoot, and canupDir when both exist', () => {
    mockLoadProjectConfig.mockReturnValue({
      config: { appId: 'app-1' },
      projectRoot: '/root',
      canupDir: '/root/canup',
    });
    mockLoadApiKey.mockReturnValue('cnup_test_key');

    const result = requireProject();

    expect(result).toEqual({
      config: { appId: 'app-1' },
      apiKey: 'cnup_test_key',
      projectRoot: '/root',
      canupDir: '/root/canup',
    });
  });
});

describe('requireClient', () => {
  test('returns the project plus a client constructed from the API key', () => {
    mockLoadProjectConfig.mockReturnValue({
      config: { appId: 'app-1' },
      projectRoot: '/root',
      canupDir: '/root/canup',
    });
    mockLoadApiKey.mockReturnValue('cnup_test_key');

    const result = requireClient();

    expect(mockCanupClient).toHaveBeenCalledWith({ token: 'cnup_test_key' });
    expect(result).toEqual({
      config: { appId: 'app-1' },
      apiKey: 'cnup_test_key',
      projectRoot: '/root',
      canupDir: '/root/canup',
      client: fakeClient,
    });
  });

  test('exits with 1 (via requireProject) when no project config is found', () => {
    using exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit');
    });
    mockLoadProjectConfig.mockReturnValue(null);

    expect(() => requireClient()).toThrow('process.exit');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
