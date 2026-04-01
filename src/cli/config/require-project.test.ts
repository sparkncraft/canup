import { describe, it, expect, vi } from 'vitest';

const { mockLoadProjectConfig } = vi.hoisted(() => ({ mockLoadProjectConfig: vi.fn() }));
const { mockLoadApiKey } = vi.hoisted(() => ({ mockLoadApiKey: vi.fn() }));
const { mockError, mockHint } = vi.hoisted(() => ({ mockError: vi.fn(), mockHint: vi.fn() }));

vi.mock('./project-config.js', () => ({ loadProjectConfig: mockLoadProjectConfig }));
vi.mock('../auth/token-store.js', () => ({ loadApiKey: mockLoadApiKey }));
vi.mock('../ui/output.js', () => ({ error: mockError, hint: mockHint }));

import { requireProject } from './require-project.js';

describe('requireProject', () => {
  it('exits with 1 when no project config is found', () => {
    using exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit');
    });
    mockLoadProjectConfig.mockReturnValue(null);

    expect(() => requireProject()).toThrow('process.exit');
    expect(mockError).toHaveBeenCalledWith(expect.stringContaining('No Canup project'));
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('exits with 1 when no API key is found', () => {
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

  it('returns config, apiKey, projectRoot, and canupDir when both exist', () => {
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
