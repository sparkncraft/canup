export async function handler(params, context) {
  /**
   * This is a demo action that echoes your prompt back.
   * Replace this with your own logic:
   *
   *   - Call an AI API (OpenAI, Anthropic, etc.)
   *   - Query a database
   *   - Process images
   *   - Any server-side computation
   *
   * @param {Object} params - JSON data from your app ({ prompt })
   * @param {Object} context - Platform context (user_id, brand_id, app_id, invocation_id)
   * @returns {any} JSON-serializable value
   */
  const prompt = params.prompt || 'Hello, world!';

  return {
    text: `Generated text for: "${prompt}"`,
    generatedAt: new Date().toISOString(),
  };
}
