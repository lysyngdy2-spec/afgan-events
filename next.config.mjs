export default {
  // Going back to a page you just saw is instant; saves still refresh it.
  experimental: { staleTimes: { dynamic: 30 } },
};
