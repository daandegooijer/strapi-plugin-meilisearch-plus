import type { Core } from '@strapi/strapi';

const destroy = ({ strapi }: { strapi: Core.Strapi }) => {
  try {
    strapi.log.info('[meilisearch-plus] Destroying plugin');
    // Cleanup any resources if needed
  } catch (error) {
    strapi.log.error('[meilisearch-plus] Destroy error:', error);
  }
};

export default destroy;
