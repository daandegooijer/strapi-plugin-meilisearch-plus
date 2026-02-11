export default {
  type: 'admin',
  routes: [
    {
      method: 'GET',
      path: '/',
      handler: 'credentials.index',
      config: {
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/credentials',
      handler: 'credentials.getCredentials',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
      },
    },
    {
      method: 'POST',
      path: '/credentials',
      handler: 'credentials.setCredentials',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
      },
    },
    {
      method: 'GET',
      path: '/test-connection',
      handler: 'credentials.testConnection',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
      },
    },
    {
      method: 'POST',
      path: '/search',
      handler: 'search.search',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
      },
    },
    {
      method: 'GET',
      path: '/index-status',
      handler: 'search.getIndexStatus',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
      },
    },
    {
      method: 'GET',
      path: '/configured-content-types',
      handler: 'contentTypes.getConfiguredContentTypes',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
      },
    },
    {
      method: 'GET',
      path: '/sync-status',
      handler: 'contentTypes.getSyncStatus',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
      },
    },
    {
      method: 'GET',
      path: '/sync-status/all',
      handler: 'contentTypes.getAllSyncStatus',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
      },
    },
    {
      method: 'GET',
      path: '/indexed-content-types',
      handler: 'contentTypes.getIndexedContentTypes',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
      },
    },
    {
      method: 'POST',
      path: '/indexed-content-types',
      handler: 'contentTypes.addIndexedContentType',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
      },
    },
    {
      method: 'DELETE',
      path: '/indexed-content-types',
      handler: 'contentTypes.removeIndexedContentType',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
      },
    },
    {
      method: 'POST',
      path: '/reindex',
      handler: 'indexing.reindexContentType',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
      },
    },
    {
      method: 'POST',
      path: '/clear-index',
      handler: 'indexing.clearIndex',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
      },
    },
    {
      method: 'GET',
      path: '/index-settings/content-types',
      handler: 'indexSettings.getContentTypesAndFields',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
      },
    },
    {
      method: 'POST',
      path: '/index-settings/save',
      handler: 'indexSettings.saveIndexSettings',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
      },
    },
    {
      method: 'POST',
      path: '/index-settings/apply',
      handler: 'indexSettings.applyIndexSettings',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
      },
    },
  ],
};
