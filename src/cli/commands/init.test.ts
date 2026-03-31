import { describe, expect, vi } from 'vitest';
import { test, output, client, tokenStore, projectConfig } from '#test/fixtures.js';

// Local mocks referenced in vi.mock() factories -- must be hoisted
const {
  mockPerformLogin,
  mockSaveProjectConfig,
  mockMkdirSync,
  mockExistsSync,
  mockReadFileSync,
  mockSelect,
  mockCreateInterface,
} = vi.hoisted(() => ({
  mockPerformLogin: vi.fn(),
  mockSaveProjectConfig: vi.fn(),
  mockMkdirSync: vi.fn(),
  mockExistsSync: vi.fn().mockReturnValue(false),
  mockReadFileSync: vi.fn(),
  mockSelect: vi.fn(),
  mockCreateInterface: vi.fn(),
}));

vi.mock('../auth/token-store.js', () => tokenStore);

vi.mock('../auth/perform-login.js', () => ({
  performLogin: mockPerformLogin,
}));

vi.mock('../api-client.js', () => ({
  CanupClient: vi.fn(function () {
    return client;
  }),
}));

vi.mock('../config/project-config.js', () => ({
  ...projectConfig,
  saveProjectConfig: mockSaveProjectConfig,
}));

vi.mock('../ui/output.js', () => output);

vi.mock('@inquirer/prompts', () => ({
  select: mockSelect,
  Separator: class Separator {
    isSeparator = true;
  },
}));

vi.mock('node:fs', async () => {
  const actual = await vi.importActual<typeof import('node:fs')>('node:fs');
  return {
    ...actual,
    mkdirSync: mockMkdirSync,
    existsSync: mockExistsSync,
    readFileSync: mockReadFileSync,
  };
});

vi.mock('node:readline/promises', () => ({
  createInterface: mockCreateInterface,
}));

describe('init command', () => {
  test('initializes project with --app-id flag (fresh init happy path)', async ({
    output,
    processMocks,
  }) => {
    tokenStore.loadToken.mockReturnValue('valid-token');
    projectConfig.loadProjectConfig.mockReturnValue(null);
    client.registerApp.mockResolvedValue({
      id: 'app-uuid-123',
      canvaAppId: 'AAFtest',
      name: 'My App',
    });
    client.createApiKey.mockResolvedValue({ key: 'cnup_full_key_123', prefix: 'cnup_full' });

    const { Command } = await import('commander');
    const { registerInitCommand } = await import('../commands/init.js');

    const program = new Command();
    registerInitCommand(program);

    await program.parseAsync(['init', '--app-id', 'AAFtest'], { from: 'user' });

    expect(client.registerApp).toHaveBeenCalledWith('AAFtest');
    expect(client.createApiKey).toHaveBeenCalledWith('app-uuid-123', 'canup-cli');
    expect(tokenStore.saveApiKey).toHaveBeenCalledWith('app-uuid-123', 'cnup_full_key_123');
    expect(mockMkdirSync).toHaveBeenCalledWith(expect.stringContaining('canup/actions'), {
      recursive: true,
    });
    expect(mockSaveProjectConfig).toHaveBeenCalledWith(process.cwd(), { appId: 'app-uuid-123' });
    expect(output.success).toHaveBeenCalledWith('Project initialized');
    expect(output.label).toHaveBeenCalledWith('App ID', 'app-uuid-123');
  });

  test('shows re-init message when project already initialized', async ({ output }) => {
    projectConfig.loadProjectConfig.mockReturnValue({
      config: { appId: 'existing-app-id' },
      projectRoot: '/fake/project',
      canupDir: '/fake/project/canup',
    });

    const { Command } = await import('commander');
    const { registerInitCommand } = await import('../commands/init.js');

    const program = new Command();
    registerInitCommand(program);

    await program.parseAsync(['init', '--app-id', 'AAFtest'], { from: 'user' });

    expect(output.info).toHaveBeenCalledWith('Project already initialized.');
    expect(output.label).toHaveBeenCalledWith('App ID', 'existing-app-id');
    expect(output.label).toHaveBeenCalledWith('Config', '/fake/project/canup/canup.json');
  });

  test('auto-triggers login when no session token exists', async ({ output, processMocks }) => {
    tokenStore.loadToken.mockReturnValue(null);
    mockPerformLogin.mockResolvedValue('auto-login-token');
    projectConfig.loadProjectConfig.mockReturnValue(null);
    client.registerApp.mockResolvedValue({
      id: 'app-uuid-456',
      canvaAppId: 'AAFauto',
      name: 'Auto App',
    });
    client.createApiKey.mockResolvedValue({ key: 'cnup_auto_key', prefix: 'cnup_auto' });

    const { Command } = await import('commander');
    const { registerInitCommand } = await import('../commands/init.js');

    const program = new Command();
    registerInitCommand(program);

    await program.parseAsync(['init', '--app-id', 'AAFauto'], { from: 'user' });

    expect(mockPerformLogin).toHaveBeenCalled();
    expect(output.info).toHaveBeenCalledWith('Not logged in. Starting login...');
    expect(output.info).toHaveBeenCalledWith('Login successful!');
    expect(client.registerApp).toHaveBeenCalledWith('AAFauto');
    expect(mockSaveProjectConfig).toHaveBeenCalledWith(process.cwd(), { appId: 'app-uuid-456' });
  });

  test('detects CANVA_APP_ID from .env file', async ({ output, processMocks }) => {
    tokenStore.loadToken.mockReturnValue('valid-token');
    projectConfig.loadProjectConfig.mockReturnValue(null);
    mockExistsSync.mockReturnValueOnce(true);
    mockReadFileSync.mockReturnValue('CANVA_APP_ID=AAFdetected\nOTHER_VAR=foo\n');
    client.registerApp.mockResolvedValue({
      id: 'app-uuid-789',
      canvaAppId: 'AAFdetected',
      name: 'Detected App',
    });
    client.createApiKey.mockResolvedValue({ key: 'cnup_det_key', prefix: 'cnup_det' });

    const { Command } = await import('commander');
    const { registerInitCommand } = await import('../commands/init.js');

    const program = new Command();
    registerInitCommand(program);

    await program.parseAsync(['init'], { from: 'user' });

    expect(output.info).toHaveBeenCalledWith('Detected Canva App ID from .env: AAFdetected');
    expect(client.registerApp).toHaveBeenCalledWith('AAFdetected');
    expect(mockSaveProjectConfig).toHaveBeenCalledWith(process.cwd(), { appId: 'app-uuid-789' });
  });

  test('handles API failure at registerApp step', async ({ output, processMocks }) => {
    tokenStore.loadToken.mockReturnValue('valid-token');
    projectConfig.loadProjectConfig.mockReturnValue(null);

    const apiError = new Error('Server error') as Error & { statusCode: number };
    apiError.statusCode = 500;
    client.registerApp.mockRejectedValue(apiError);

    const { Command } = await import('commander');
    const { registerInitCommand } = await import('../commands/init.js');

    const program = new Command();
    registerInitCommand(program);

    await program.parseAsync(['init', '--app-id', 'AAFfail'], { from: 'user' });

    expect(output.error).toHaveBeenCalledWith('Init failed: Server error');
    expect(processMocks.exit).toHaveBeenCalledWith(1);
  });

  test('handles API failure at createApiKey step', async ({ output, processMocks }) => {
    tokenStore.loadToken.mockReturnValue('valid-token');
    projectConfig.loadProjectConfig.mockReturnValue(null);
    client.registerApp.mockResolvedValue({
      id: 'app-uuid-123',
      canvaAppId: 'AAFtest',
      name: 'App',
    });

    const apiError = new Error('Key creation failed') as Error & { statusCode: number };
    apiError.statusCode = 500;
    client.createApiKey.mockRejectedValue(apiError);

    const { Command } = await import('commander');
    const { registerInitCommand } = await import('../commands/init.js');

    const program = new Command();
    registerInitCommand(program);

    await program.parseAsync(['init', '--app-id', 'AAFtest'], { from: 'user' });

    expect(output.error).toHaveBeenCalledWith('Init failed: Key creation failed');
    expect(processMocks.exit).toHaveBeenCalledWith(1);
  });

  test('creates canup/ and canup/actions/ directories', async ({ processMocks }) => {
    tokenStore.loadToken.mockReturnValue('valid-token');
    projectConfig.loadProjectConfig.mockReturnValue(null);
    client.registerApp.mockResolvedValue({ id: 'app-1' });
    client.createApiKey.mockResolvedValue({ key: 'cnup_k', prefix: 'cnup' });

    const { Command } = await import('commander');
    const { registerInitCommand } = await import('../commands/init.js');

    const program = new Command();
    registerInitCommand(program);

    await program.parseAsync(['init', '--app-id', 'AAFtest'], { from: 'user' });

    expect(mockMkdirSync).toHaveBeenCalledWith(expect.stringContaining('canup/actions'), {
      recursive: true,
    });
  });

  test('writes config with only appId (no canvaAppId in new convention)', async ({
    processMocks,
  }) => {
    tokenStore.loadToken.mockReturnValue('valid-token');
    projectConfig.loadProjectConfig.mockReturnValue(null);
    client.registerApp.mockResolvedValue({ id: 'app-uuid-100' });
    client.createApiKey.mockResolvedValue({ key: 'cnup_key', prefix: 'cnup' });

    const { Command } = await import('commander');
    const { registerInitCommand } = await import('../commands/init.js');

    const program = new Command();
    registerInitCommand(program);

    await program.parseAsync(['init', '--app-id', 'AAFtest'], { from: 'user' });

    expect(mockSaveProjectConfig).toHaveBeenCalledWith(process.cwd(), { appId: 'app-uuid-100' });
    // Ensure no canvaAppId in config
    const callArgs = mockSaveProjectConfig.mock.calls[0];
    expect(callArgs[1]).not.toHaveProperty('canvaAppId');
  });

  test('handles 409 conflict when another user owns the canvaAppId', async ({
    output,
    processMocks,
  }) => {
    tokenStore.loadToken.mockReturnValue('valid-token');
    projectConfig.loadProjectConfig.mockReturnValue(null);

    const apiError = new Error('Conflict') as Error & { statusCode: number };
    apiError.statusCode = 409;
    client.registerApp.mockRejectedValue(apiError);

    const { Command } = await import('commander');
    const { registerInitCommand } = await import('../commands/init.js');

    const program = new Command();
    registerInitCommand(program);

    await program.parseAsync(['init', '--app-id', 'AAFconflict'], { from: 'user' });

    expect(output.error).toHaveBeenCalledWith(
      expect.stringContaining('already registered by another user'),
    );
    expect(processMocks.exit).toHaveBeenCalledWith(1);
  });

  test('handles 401 session expired during init', async ({ output, processMocks }) => {
    tokenStore.loadToken.mockReturnValue('expired-token');
    projectConfig.loadProjectConfig.mockReturnValue(null);

    const apiError = new Error('Unauthorized') as Error & { statusCode: number };
    apiError.statusCode = 401;
    client.registerApp.mockRejectedValue(apiError);

    const { Command } = await import('commander');
    const { registerInitCommand } = await import('../commands/init.js');

    const program = new Command();
    registerInitCommand(program);

    await program.parseAsync(['init', '--app-id', 'AAFtest'], { from: 'user' });

    expect(output.error).toHaveBeenCalledWith('Session expired.');
    expect(output.hint).toHaveBeenCalledWith('Run `canup login` to re-authenticate.');
    expect(processMocks.exit).toHaveBeenCalledWith(1);
  });

  test('displays API key prefix with ellipsis on success', async ({ output, processMocks }) => {
    tokenStore.loadToken.mockReturnValue('valid-token');
    projectConfig.loadProjectConfig.mockReturnValue(null);
    client.registerApp.mockResolvedValue({ id: 'app-1' });
    client.createApiKey.mockResolvedValue({ key: 'cnup_mykey_full', prefix: 'cnup_mykey' });

    const { Command } = await import('commander');
    const { registerInitCommand } = await import('../commands/init.js');

    const program = new Command();
    registerInitCommand(program);

    await program.parseAsync(['init', '--app-id', 'AAFtest'], { from: 'user' });

    expect(output.label).toHaveBeenCalledWith('API Key', 'cnup_mykey...');
    expect(output.hint).toHaveBeenCalledWith('Add the canup/ folder to your git repository.');
  });

  test('shows app picker when user has existing apps and selects one', async ({
    output,
    processMocks,
  }) => {
    tokenStore.loadToken.mockReturnValue('valid-token');
    projectConfig.loadProjectConfig.mockReturnValue(null);

    client.listApps.mockResolvedValue([
      {
        id: 'app-existing-1',
        canvaAppId: 'AAFexist1',
        name: 'My App',
        createdAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 'app-existing-2',
        canvaAppId: 'AAFexist2',
        name: 'Other App',
        createdAt: '2026-01-01T00:00:00Z',
      },
    ]);
    client.listActions.mockResolvedValue([{ id: 'act-1', slug: 'hello', deployed: true }]);
    client.createApiKey.mockResolvedValue({ key: 'cnup_pick_key', prefix: 'cnup_pick' });

    // User selects the first existing app
    mockSelect.mockResolvedValue('app-existing-1');

    const { Command } = await import('commander');
    const { registerInitCommand } = await import('../commands/init.js');

    const program = new Command();
    registerInitCommand(program);

    await program.parseAsync(['init'], { from: 'user' });

    expect(client.listApps).toHaveBeenCalled();
    expect(mockSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Select an app',
      }),
    );
    expect(client.createApiKey).toHaveBeenCalledWith('app-existing-1', 'canup-cli');
    expect(mockSaveProjectConfig).toHaveBeenCalledWith(process.cwd(), { appId: 'app-existing-1' });
    expect(output.success).toHaveBeenCalledWith('Project initialized');
    // Should suggest pull since app has deployed actions
    expect(output.hint).toHaveBeenCalledWith(expect.stringContaining('canup pull'));
  });

  test('skips picker when user has no existing apps', async ({ output, processMocks }) => {
    tokenStore.loadToken.mockReturnValue('valid-token');
    projectConfig.loadProjectConfig.mockReturnValue(null);

    client.listApps.mockResolvedValue([]);
    client.registerApp.mockResolvedValue({ id: 'app-new-1' });
    client.createApiKey.mockResolvedValue({ key: 'cnup_new_key', prefix: 'cnup_new' });

    mockCreateInterface.mockReturnValue({
      question: vi.fn().mockResolvedValue('AAFnewapp'),
      close: vi.fn(),
    });

    const { Command } = await import('commander');
    const { registerInitCommand } = await import('../commands/init.js');

    const program = new Command();
    registerInitCommand(program);

    await program.parseAsync(['init'], { from: 'user' });

    expect(client.listApps).toHaveBeenCalled();
    expect(mockSelect).not.toHaveBeenCalled();
    expect(client.registerApp).toHaveBeenCalledWith('AAFnewapp');
  });

  test('app picker "Create a new app" falls through to prompt', async ({
    output,
    processMocks,
  }) => {
    tokenStore.loadToken.mockReturnValue('valid-token');
    projectConfig.loadProjectConfig.mockReturnValue(null);

    client.listApps.mockResolvedValue([
      { id: 'app-1', canvaAppId: 'AAFold', name: 'Old App', createdAt: '2026-01-01T00:00:00Z' },
    ]);
    client.registerApp.mockResolvedValue({ id: 'app-brand-new' });
    client.createApiKey.mockResolvedValue({ key: 'cnup_k', prefix: 'cnup' });

    mockSelect.mockResolvedValue('__new__');

    mockCreateInterface.mockReturnValue({
      question: vi.fn().mockResolvedValue('AAFbrandnew'),
      close: vi.fn(),
    });

    const { Command } = await import('commander');
    const { registerInitCommand } = await import('../commands/init.js');

    const program = new Command();
    registerInitCommand(program);

    await program.parseAsync(['init'], { from: 'user' });

    expect(mockSelect).toHaveBeenCalled();
    expect(client.registerApp).toHaveBeenCalledWith('AAFbrandnew');
    expect(mockSaveProjectConfig).toHaveBeenCalledWith(process.cwd(), { appId: 'app-brand-new' });
  });

  test('does not suggest pull when existing app has no deployed actions', async ({
    output,
    processMocks,
  }) => {
    tokenStore.loadToken.mockReturnValue('valid-token');
    projectConfig.loadProjectConfig.mockReturnValue(null);

    client.listApps.mockResolvedValue([
      {
        id: 'app-empty',
        canvaAppId: 'AAFempty',
        name: 'Empty App',
        createdAt: '2026-01-01T00:00:00Z',
      },
    ]);
    client.listActions.mockResolvedValue([]);
    client.createApiKey.mockResolvedValue({ key: 'cnup_k', prefix: 'cnup' });

    mockSelect.mockResolvedValue('app-empty');

    const { Command } = await import('commander');
    const { registerInitCommand } = await import('../commands/init.js');

    const program = new Command();
    registerInitCommand(program);

    await program.parseAsync(['init'], { from: 'user' });

    // Should NOT suggest pull since no deployed actions
    const hintCalls = output.hint.mock.calls.map((c: string[]) => c[0]);
    expect(hintCalls).not.toEqual(expect.arrayContaining([expect.stringContaining('canup pull')]));
  });
});
