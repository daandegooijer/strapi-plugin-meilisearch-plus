import type { Core } from '@strapi/strapi';

const register = ({ strapi }: { strapi: Core.Strapi }) => {
  strapi.log.info('[meilisearch-plus] Registering plugin');
  // No additional registration needed at this time
};

export default register;
