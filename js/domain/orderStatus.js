/**
 * Order lifecycle as a pure function of time, so the mock server can answer
 * "where is my order?" for any moment without a background job.
 *
 * Stage offsets are in seconds after the order was placed, multiplied by the
 * order's `timeScale` (1 = real time; ?speed=10 at checkout gives 0.1).
 */
import { pointAlongRoute } from "./geo.js";

export const ORDER_STAGES = Object.freeze([
  { id: "PLACED", label: "Order placed", icon: "fa-receipt", at: 0 },
  { id: "CONFIRMED", label: "Confirmed", icon: "fa-circle-check", at: 10 },
  { id: "PREPARING", label: "Preparing", icon: "fa-fire-burner", at: 30 },
  { id: "OUT_FOR_DELIVERY", label: "Out for delivery", icon: "fa-motorcycle", at: 90 },
  { id: "DELIVERED", label: "Delivered", icon: "fa-house-circle-check", at: 210 },
]);

const stageIndex = (id) => ORDER_STAGES.findIndex((s) => s.id === id);
const PICKUP_AT = ORDER_STAGES[stageIndex("OUT_FOR_DELIVERY")].at;
const DELIVERED_AT = ORDER_STAGES[stageIndex("DELIVERED")].at;

/** Customer-facing copy for each stage. */
export function stageMessage(stageId, order) {
  const restaurant = order.restaurant?.name ?? "The restaurant";
  const rider = order.rider?.name ?? "Your rider";
  return {
    PLACED: { title: "Order placed", text: `Waiting for ${restaurant} to accept your order.` },
    CONFIRMED: { title: "Order confirmed", text: `${restaurant} has accepted your order.` },
    PREPARING: { title: "Preparing your food", text: `${restaurant} is cooking your order.` },
    OUT_FOR_DELIVERY: { title: "On the way", text: `${rider} has picked up your order and is heading to you.` },
    DELIVERED: { title: "Delivered", text: "Enjoy your meal! Thanks for ordering with Foodie." },
  }[stageId];
}

/**
 * @param {{ createdAt: string, timeScale?: number, route?: [number, number][] }} order
 * @param {Date} [now]
 * @returns {{
 *   status: string, stageIndex: number, delivered: boolean,
 *   etaSeconds: number, riderProgress: number, riderPosition: [number, number] | null,
 *   timeline: { id: string, label: string, icon: string, reached: boolean, reachedAt: string }[],
 * }}
 */
export function getOrderProgress(order, now = new Date()) {
  const scale = order.timeScale ?? 1;
  const start = new Date(order.createdAt).getTime();
  const elapsed = Math.max(0, (now.getTime() - start) / 1000 / scale);

  let index = 0;
  ORDER_STAGES.forEach((stage, i) => {
    if (elapsed >= stage.at) index = i;
  });

  const riderProgress = Math.min(1, Math.max(0, (elapsed - PICKUP_AT) / (DELIVERED_AT - PICKUP_AT)));
  const route = order.route ?? [];

  return {
    status: ORDER_STAGES[index].id,
    stageIndex: index,
    delivered: ORDER_STAGES[index].id === "DELIVERED",
    etaSeconds: Math.ceil(Math.max(0, DELIVERED_AT - elapsed) * scale),
    riderProgress,
    riderPosition: route.length ? pointAlongRoute(route, riderProgress) : null,
    timeline: ORDER_STAGES.map((stage, i) => ({
      id: stage.id,
      label: stage.label,
      icon: stage.icon,
      reached: i <= index,
      reachedAt: new Date(start + stage.at * scale * 1000).toISOString(),
    })),
  };
}
