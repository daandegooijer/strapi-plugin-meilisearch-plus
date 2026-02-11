export default ({ strapi }: { strapi: any }) => ({
  /**
   * Get all indexed content types and their fields for attribute selection
   */
  async getContentTypesAndFields(ctx: any) {
    try {
      const storeService = strapi.plugin('meilisearch-plus').service('store');

      // Get all indexed content types
      const indexedContentTypes = await storeService.getIndexedContentTypes();

      // Get fields for each content type
      const fields: { [key: string]: string[] } = {};
      const filterableAttributes: { [key: string]: { [key: string]: boolean } } = {};
      const sortableAttributes: { [key: string]: { [key: string]: boolean } } = {};

      // Process each indexed content type
      for (const contentType of indexedContentTypes) {
        try {
          const model = strapi.getModel(contentType);

          if (!model || !model.attributes) {
            strapi.log.warn(
              `[meilisearch-plus] Could not find model for content type: ${contentType}`
            );
            continue;
          }

          // Get simple fields (not relations)
          fields[contentType] = [
            ...Object.entries(model.attributes)
              .filter(([_, attr]: [string, any]) => {
                // Include searchable/filterable field types
                const type = attr.type;
                return (
                  type === 'string' ||
                  type === 'text' ||
                  type === 'richtext' ||
                  type === 'email' ||
                  type === 'integer' ||
                  type === 'decimal' ||
                  type === 'biginteger' ||
                  type === 'float' ||
                  type === 'boolean' ||
                  type === 'date' ||
                  type === 'datetime' ||
                  type === 'time' ||
                  type === 'enumeration'
                );
              })
              .map(([name]) => name),
          ];

          // Initialize with empty objects
          filterableAttributes[contentType] = {};
          sortableAttributes[contentType] = {};
        } catch (err) {
          strapi.log.error(`[meilisearch-plus] Error processing content type ${contentType}:`, err);
        }
      }

      // Load stored settings and redistribute to all content types for UI display
      const storedSettings = await storeService.getStoreKey({
        key: 'meilisearch-index-settings',
      });

      if (storedSettings) {
        const storedFilterable = storedSettings.filterableAttributes || [];
        const storedSortable = storedSettings.sortableAttributes || [];

        // Apply stored settings to all content types for UI display
        indexedContentTypes.forEach((contentType: string) => {
          storedFilterable.forEach((field: string) => {
            if (fields[contentType]?.includes(field)) {
              filterableAttributes[contentType][field] = true;
            }
          });

          storedSortable.forEach((field: string) => {
            if (fields[contentType]?.includes(field)) {
              sortableAttributes[contentType][field] = true;
            }
          });
        });

        strapi.log.info(
          `[meilisearch-plus] Loaded stored settings: filterable=[${storedFilterable.join(', ')}], sortable=[${storedSortable.join(', ')}]`
        );
      }

      // Get stored maxTotalHits
      const storedMaxHits = await storeService.getStoreKey({
        key: 'meilisearch-max-total-hits',
      });

      ctx.body = {
        contentTypes: indexedContentTypes.map((uid: string) => ({
          uid,
          name: strapi.getModel(uid)?.info?.displayName || uid,
        })),
        fields,
        filterableAttributes,
        sortableAttributes,
        maxTotalHits: storedMaxHits || 1000,
      };
    } catch (error: any) {
      strapi.log.error('[meilisearch-plus] Error in getContentTypesAndFields:', error);
      ctx.throw(500, error.message);
    }
  },

  /**
   * Save index settings (filterable/sortable attributes and maxTotalHits)
   */
  async saveIndexSettings(ctx: any) {
    try {
      const { filterableAttributes, sortableAttributes, maxTotalHits } = ctx.request.body;
      const storeService = strapi.plugin('meilisearch-plus').service('store');

      strapi.log.info('[meilisearch-plus] saveIndexSettings received maxTotalHits:', maxTotalHits);

      // Merge all filterable attributes across all content types into a single array
      const mergedFilterableAttributes: string[] = [];
      const mergedSortableAttributes: string[] = [];

      for (const [contentType, attrs] of Object.entries(filterableAttributes)) {
        // attrs is already an array of field names from the UI
        if (Array.isArray(attrs)) {
          attrs.forEach((field: string) => {
            if (!mergedFilterableAttributes.includes(field)) {
              mergedFilterableAttributes.push(field);
            }
          });
        }
      }

      for (const [contentType, attrs] of Object.entries(sortableAttributes)) {
        // attrs is already an array of field names from the UI
        if (Array.isArray(attrs)) {
          attrs.forEach((field: string) => {
            if (!mergedSortableAttributes.includes(field)) {
              mergedSortableAttributes.push(field);
            }
          });
        }
      }

      // Ensure _contentType is always included in filterable and sortable attributes (it's mandatory)
      if (!mergedFilterableAttributes.includes('_contentType')) {
        mergedFilterableAttributes.unshift('_contentType');
      }
      if (!mergedSortableAttributes.includes('_contentType')) {
        mergedSortableAttributes.unshift('_contentType');
      }

      // Save the merged settings
      await storeService.setStoreKey({
        key: 'meilisearch-index-settings',
        value: {
          filterableAttributes: mergedFilterableAttributes,
          sortableAttributes: mergedSortableAttributes,
        },
      });

      strapi.log.info(
        `[meilisearch-plus] Saved merged index settings: filterable=[${mergedFilterableAttributes.join(', ')}], sortable=[${mergedSortableAttributes.join(', ')}]`
      );

      // Save maxTotalHits
      if (maxTotalHits) {
        await storeService.setStoreKey({
          key: 'meilisearch-max-total-hits',
          value: maxTotalHits,
        });
        strapi.log.info(`[meilisearch-plus] Saved maxTotalHits: ${maxTotalHits}`);
      }

      ctx.body = {
        data: {
          message: 'Index settings saved successfully',
        },
      };
    } catch (error: any) {
      strapi.log.error('[meilisearch-plus] Error in saveIndexSettings:', error);
      ctx.throw(500, error.message);
    }
  },

  /**
   * Apply current settings to Meilisearch index
   */
  async applyIndexSettings(ctx: any) {
    try {
      const storeService = strapi.plugin('meilisearch-plus').service('store');
      const meilisearchService = strapi.plugin('meilisearch-plus').service('meilisearch');

      // Get stored settings
      const settings = await storeService.getStoreKey({
        key: 'meilisearch-index-settings',
      });

      const filterableAttributes = settings?.filterableAttributes || [];
      const sortableAttributes = settings?.sortableAttributes || [];

      // Ensure _contentType is always included (it's mandatory)
      if (!filterableAttributes.includes('_contentType')) {
        filterableAttributes.unshift('_contentType');
      }
      if (!sortableAttributes.includes('_contentType')) {
        sortableAttributes.unshift('_contentType');
      }

      // Get stored maxTotalHits
      const maxTotalHits = await storeService.getStoreKey({
        key: 'meilisearch-max-total-hits',
      });

      strapi.log.info(
        `[meilisearch-plus] Applying settings: filterable=[${filterableAttributes.join(', ')}], sortable=[${sortableAttributes.join(', ')}], maxTotalHits=${maxTotalHits}`
      );

      // Build settings object with all configuration
      const indexSettings: any = {
        filterableAttributes,
        sortableAttributes,
      };

      // Add pagination settings if maxTotalHits is set
      if (maxTotalHits) {
        indexSettings.pagination = {
          maxTotalHits,
        };
      }

      // Apply settings to Meilisearch index
      await meilisearchService.updateIndexSettings({
        settings: indexSettings,
      });

      ctx.body = {
        data: {
          message: 'Settings applied to Meilisearch index successfully',
        },
      };
    } catch (error: any) {
      strapi.log.error('[meilisearch-plus] Error in applyIndexSettings:', error);
      ctx.throw(500, error.message);
    }
  },
});
