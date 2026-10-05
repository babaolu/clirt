/**
 * While `paused` > 0, live cart events don't reload page data. Checkout pauses it while an order is
 * being placed: that empties the cart and fires an event, and reloading /checkout mid-submit would
 * redirect to /cart before the order page opens.
 */
export const liveSync = $state({ paused: 0 });
