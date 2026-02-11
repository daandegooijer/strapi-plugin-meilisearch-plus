export default {
  type: 'content-api',
  routes: [
    {
      method: 'POST',
      path: '/search',
      handler: 'search.search',
      config: {
        policies: [],
      },
    },
  ],
};
