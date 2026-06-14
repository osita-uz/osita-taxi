export const ORDER_LIFETIME_HOURS = 24;
export const ORDER_WARN_BEFORE_MINUTES = 15;
export const ORDER_EXTEND_HOURS = 1;

export const PRICE_STATS_MIN_DATA_POINTS = 5;
export const PRICE_STATS_LOOKBACK_DAYS = 30;
export const PRICE_SURVEY_SAMPLE_RATE = 0.3;

export const REDIS_KEYS = {
  routeStats: (routeId: number) => `route:stats:${routeId}`,
  routeDriversToday: (routeId: number) => `route:drivers:${routeId}:today`,
  orderViews: (orderId: number) => `order:${orderId}:views`,
  driverSession: (telegramId: bigint | string) =>
    `session:driver:${telegramId}`,
} as const;

export const QUEUE_NAMES = {
  ordersNotify: "orders_notify",
  ordersExpiry: "orders_expiry",
  ordersWarn: "orders_warn",
  priceSurvey: "price_survey",
  priceStats: "price_stats",
} as const;
