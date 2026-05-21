import { prepareDesignEditor } from '@canva/intents/design';
import designEditor from './intents/design_editor';

(globalThis as typeof globalThis & { __canup_url: string }).__canup_url = 'https://localhost:3000';

prepareDesignEditor(designEditor);
