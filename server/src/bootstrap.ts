import type { Core } from '@strapi/strapi';

const bootstrap = ({ strapi }: { strapi: Core.Strapi }) => {
  try {
    strapi.log.info('[meilisearch-plus] Bootstrapping plugin');

    const storeService = strapi.plugin('meilisearch-plus').service('store');
    const lifecycleService = strapi.plugin('meilisearch-plus').service('lifecycle');
    const meilisearchService = strapi.plugin('meilisearch-plus').service('meilisearch');

    // Initialize lifecycle subscriptions for all indexed content types
    (async () => {
      try {
        // Sync credentials between store and plugin config file (one-time initialization)
        await storeService.syncCredentials();
        strapi.log.info('[meilisearch-plus] Credentials synced from plugin config');

        // Validate that indexed content types actually have documents in MeiliSearch
        await meilisearchService.syncIndexedCollections();

        // Get indexed content types (user-selected to index) from store
        const indexedContentTypes = await storeService.getIndexedContentTypes();

        strapi.log.info(
          `[meilisearch-plus] Retrieved ${indexedContentTypes?.length || 0} indexed content types from store`
        );

        if (indexedContentTypes && indexedContentTypes.length > 0) {
          strapi.log.info(
            `[meilisearch-plus] Subscribing to ${indexedContentTypes.length} indexed content types:`,
            indexedContentTypes
          );

          for (const contentType of indexedContentTypes) {
            try {
              strapi.log.info(`[meilisearch-plus] Subscribing to content type: ${contentType}`);
              lifecycleService.subscribeContentType({ contentType });
              strapi.log.info(`[meilisearch-plus] ✓ Successfully subscribed to: ${contentType}`);
            } catch (error) {
              strapi.log.warn(`[meilisearch-plus] ✗ Failed to subscribe to ${contentType}:`, error);
            }
          }
        } else {
          strapi.log.warn(
            '[meilisearch-plus] ⚠️  No indexed content types found - lifecycle subscriptions will not be active'
          );
        }

        strapi.log.info('[meilisearch-plus] ✓ Bootstrap complete');
      } catch (error) {
        strapi.log.error('[meilisearch-plus] Bootstrap error:', error);
      }
    })();
  } catch (error) {
    strapi.log.error('[meilisearch-plus] Bootstrap initialization error:', error);
  }
};

export default bootstrap;
