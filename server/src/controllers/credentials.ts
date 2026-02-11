/**
 * Controller for managing MeiliSearch credentials
 */
export default ({ strapi }) => ({
  async index(ctx) {
    ctx.body = { message: 'MeiliSearch Plus API' };
  },
  async getCredentials(ctx) {
    try {
      const storeService = strapi.plugin('meilisearch-plus').service('store');
      const credentials = await storeService.getCredentials();
      ctx.body = { data: credentials };
    } catch (error) {
      strapi.log.error('[meilisearch-plus] Failed to get credentials:', error);
      ctx.body = { error: error.message };
      ctx.status = 500;
    }
  },

  async setCredentials(ctx) {
    try {
      const { host, apiKey, indexName } = ctx.request.body;
      const storeService = strapi.plugin('meilisearch-plus').service('store');

      await storeService.setCredentials({ host, apiKey, indexName });

      const credentials = await storeService.getCredentials();
      ctx.body = { data: credentials };
    } catch (error) {
      strapi.log.error('[meilisearch-plus] Failed to set credentials:', error);
      ctx.body = { error: error.message };
      ctx.status = 500;
    }
  },

  async testConnection(ctx) {
    try {
      const storeService = strapi.plugin('meilisearch-plus').service('store');
      const clientService = strapi.plugin('meilisearch-plus').service('meilisearch-client');

      const credentials = await storeService.getCredentials();
      const client = clientService.createClient(credentials);
      const isHealthy = await clientService.testConnection(client);

      ctx.body = { data: { healthy: isHealthy } };
    } catch (error) {
      strapi.log.error('[meilisearch-plus] Connection test failed:', error);
      ctx.body = { error: error.message, data: { healthy: false } };
      ctx.status = 500;
    }
  },
});
