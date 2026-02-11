/**
 * Controller for managing indexed content types
 */
export default ({ strapi }) => ({
  async getConfiguredContentTypes(ctx) {
    try {
      // Try accessing plugin config the way the old plugin does it
      let pluginConfig = strapi.config.get('plugin::meilisearch-plus');
      strapi.log.info('[meilisearch-plus] Accessed via plugin::meilisearch-plus:', !!pluginConfig);

      if (!pluginConfig) {
        pluginConfig = strapi.config.get('plugins')?.['meilisearch-plus'];
        strapi.log.info(
          '[meilisearch-plus] Accessed via plugins.meilisearch-plus:',
          !!pluginConfig
        );
      }

      pluginConfig = pluginConfig || {};
      strapi.log.info(
        '[meilisearch-plus] Final plugin config:',
        JSON.stringify(pluginConfig, null, 2)
      );

      // Filter out non-content-type keys
      const configured = Object.keys(pluginConfig).filter(
        (key) =>
          key !== 'host' &&
          key !== 'apiKey' &&
          key !== 'enabled' &&
          key !== 'resolve' &&
          typeof pluginConfig[key] === 'object'
      );

      strapi.log.info('[meilisearch-plus] Configured content types:', configured);
      ctx.body = { data: configured };
    } catch (error) {
      strapi.log.error('[meilisearch-plus] Failed to get configured content types:', error);
      ctx.body = { error: error.message };
      ctx.status = 500;
    }
  },

  async getSyncStatus(ctx) {
    try {
      const contentTypeService = strapi.plugin('meilisearch-plus').service('content-types');
      const { contentType } = ctx.query;

      if (!contentType) {
        ctx.status = 400;
        ctx.body = { error: 'Content type is required' };
        return;
      }

      const syncStatus = await contentTypeService.getSyncStatus({ contentType });
      ctx.body = { data: syncStatus };
    } catch (error) {
      strapi.log.error('[meilisearch-plus] Failed to get sync status:', error);
      ctx.body = { error: error.message };
      ctx.status = 500;
    }
  },

  async getAllSyncStatus(ctx) {
    try {
      const contentTypeService = strapi.plugin('meilisearch-plus').service('content-types');
      const storeService = strapi.plugin('meilisearch-plus').service('store');

      // Get configured and indexed content types (short names)
      let pluginConfig = strapi.config.get('plugin::meilisearch-plus');

      if (!pluginConfig) {
        pluginConfig = strapi.config.get('plugins')?.['meilisearch-plus'] || {};
      }

      const configuredShortNames = Object.keys(pluginConfig).filter(
        (key) =>
          key !== 'host' &&
          key !== 'apiKey' &&
          key !== 'enabled' &&
          key !== 'resolve' &&
          typeof pluginConfig[key] === 'object'
      );

      // Map short names to UIDs using strapi.contentTypes
      const allContentTypes = strapi.contentTypes;
      const shortNameToUid = {};

      // console.log('All content types in Strapi:', Object.keys(allContentTypes));
      Object.keys(allContentTypes).forEach((uid) => {
        const lastPart = uid.split('.').pop();
        if (lastPart && configuredShortNames.includes(lastPart)) {
          shortNameToUid[lastPart] = uid;
        }
      });

      // Only include UIDs that match configured short names
      const configuredUids = configuredShortNames
        .map((short) => shortNameToUid[short])
        .filter(Boolean);

      const indexed = await storeService.getIndexedContentTypes();

      // Get sync status for all configured UIDs
      const syncStatuses = await contentTypeService.getSyncStatusForMultiple({
        contentTypes: configuredUids,
      });

      // Combine with indexed status and add displayName from schema
      const result = configuredUids.map((uid) => ({
        contentType: uid,
        displayName: allContentTypes[uid]?.info?.displayName || uid,
        ...syncStatuses[uid],
        isIndexed: indexed.includes(uid),
      }));

      ctx.body = { data: result };
    } catch (error) {
      strapi.log.error('[meilisearch-plus] Failed to get all sync statuses:', error);
      ctx.body = { error: error.message };
      ctx.status = 500;
    }
  },

  async getIndexedContentTypes(ctx) {
    try {
      const storeService = strapi.plugin('meilisearch-plus').service('store');
      const indexedContentTypes = await storeService.getIndexedContentTypes();

      ctx.body = { data: indexedContentTypes || [] };
    } catch (error) {
      strapi.log.error('[meilisearch-plus] Failed to get indexed content types:', error);
      ctx.body = { error: error.message };
      ctx.status = 500;
    }
  },

  async addIndexedContentType(ctx) {
    try {
      const { contentType } = ctx.request.body;

      if (!contentType) {
        ctx.status = 400;
        ctx.body = { error: 'Content type is required' };
        return;
      }

      const storeService = strapi.plugin('meilisearch-plus').service('store');
      const lifecycleService = strapi.plugin('meilisearch-plus').service('lifecycle');

      await storeService.addIndexedContentType(contentType);
      lifecycleService.subscribeContentType({ contentType });

      const indexedContentTypes = await storeService.getIndexedContentTypes();
      ctx.body = { data: indexedContentTypes };
    } catch (error) {
      strapi.log.error('[meilisearch-plus] Failed to add indexed content type:', error);
      ctx.body = { error: error.message };
      ctx.status = 500;
    }
  },

  async removeIndexedContentType(ctx) {
    try {
      const { contentType } = ctx.query;

      if (!contentType) {
        ctx.status = 400;
        ctx.body = { error: 'Content type is required' };
        return;
      }

      const storeService = strapi.plugin('meilisearch-plus').service('store');
      const lifecycleService = strapi.plugin('meilisearch-plus').service('lifecycle');
      const meilisearchService = strapi.plugin('meilisearch-plus').service('meilisearch');

      // Remove all documents for this content type from MeiliSearch
      await meilisearchService.emptyOrDeleteIndex({ contentType });

      // Remove from store and unsubscribe
      await storeService.removeIndexedContentType(contentType);
      lifecycleService.unsubscribeContentType({ contentType });

      const indexedContentTypes = await storeService.getIndexedContentTypes();
      ctx.body = { data: indexedContentTypes };
    } catch (error) {
      strapi.log.error('[meilisearch-plus] Failed to remove indexed content type:', error);
      ctx.body = { error: error.message };
      ctx.status = 500;
    }
  },
});
