import type { Core } from '@strapi/strapi';

export interface ContentTypeConfig {
  transformEntry?: (options: { entry: any; contentType: string }) => Promise<any>;
  filterEntry?: (options: { entry: any; contentType: string }) => Promise<boolean>;
  [key: string]: any;
}

export interface PluginConfig {
  host?: string;
  apiKey?: string;
  [key: string]: ContentTypeConfig | string | undefined;
}

/**
 * Config service for managing plugin configuration from plugins.ts
 * Handles the transformEntry, filterEntry and other config options
 */
export default ({ strapi }: { strapi: Core.Strapi }) => {
  const contentTypeService = strapi.plugin('meilisearch-plus').service('content-types');

  return {
    /**
     * Get the full plugin configuration
     */
    getPluginConfig(): PluginConfig {
      return (strapi.config.get('plugin::meilisearch-plus') || {}) as PluginConfig;
    },

    /**
     * Get the configuration for a specific content type
     * @param contentType - Can be short name (e.g., 'page') or full UID (e.g., 'api::page.page')
     */
    getContentTypeConfig(contentType: string): ContentTypeConfig {
      const pluginConfig = this.getPluginConfig();

      // Try direct lookup first (short name)
      if (pluginConfig[contentType]) {
        return (pluginConfig[contentType] as ContentTypeConfig) || {};
      }

      // If not found and looks like a UID, extract the short name
      // api::vacancy.vacancy -> vacancy
      const shortName = contentType.split('.').pop();
      if (shortName && pluginConfig[shortName]) {
        return (pluginConfig[shortName] as ContentTypeConfig) || {};
      }

      return {};
    },

    /**
     * Transform entries using the transformEntry function from plugin config
     * @param contentType - The short name (e.g., 'page', 'job')
     * @param entries - Array of entries to transform
     */
    async transformEntries({
      contentType,
      entries,
    }: {
      contentType: string;
      entries: any[];
    }): Promise<any[]> {
      if (!Array.isArray(entries) || entries.length === 0) {
        return entries;
      }

      const contentTypeConfig = this.getContentTypeConfig(contentType);

      // Check if transformEntry function is defined in the config
      if (typeof contentTypeConfig?.transformEntry !== 'function') {
        return entries;
      }

      try {
        const transformed = await Promise.all(
          entries.map(async (entry) =>
            contentTypeConfig.transformEntry({
              entry,
              contentType,
            })
          )
        );

        // Validate that all transformed entries are objects
        if (
          transformed.length > 0 &&
          transformed.some((item) => typeof item !== 'object' || item === null)
        ) {
          strapi.log.error(
            `[meilisearch-plus] transformEntry for ${contentType} returned invalid data`
          );
          return entries;
        }

        return transformed;
      } catch (error) {
        strapi.log.error(
          `[meilisearch-plus] Error applying transformEntry for ${contentType}:`,
          error
        );
        return entries;
      }
    },

    /**
     * Filter entries using the filterEntry function from plugin config
     * @param contentType - The short name (e.g., 'page', 'job')
     * @param entries - Array of entries to filter
     */
    async filterEntries({
      contentType,
      entries,
    }: {
      contentType: string;
      entries: any[];
    }): Promise<any[]> {
      if (!Array.isArray(entries) || entries.length === 0) {
        return entries;
      }

      const contentTypeConfig = this.getContentTypeConfig(contentType);

      // Check if filterEntry function is defined in the config
      if (typeof contentTypeConfig?.filterEntry !== 'function') {
        return entries;
      }

      try {
        const filtered: any[] = [];

        for (const entry of entries) {
          const isValid = await contentTypeConfig.filterEntry({
            entry,
            contentType,
          });

          if (isValid) {
            filtered.push(entry);
          }
        }

        return filtered;
      } catch (error) {
        strapi.log.error(
          `[meilisearch-plus] Error applying filterEntry for ${contentType}:`,
          error
        );
        return entries;
      }
    },
  };
};
