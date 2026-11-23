/** Seed data for the mock backend. Loaded into IndexedDB on first run. */
import { unsplash } from "./unsplash.js";

export const CATEGORIES = [
  { id: "burger", label: "Burgers" },
  { id: "pizza", label: "Pizza" },
  { id: "biryani", label: "Biryani" },
  { id: "chicken", label: "Fried Chicken" },
  { id: "kebab", label: "Kebabs" },
  { id: "rolls", label: "Rolls" },
  { id: "thali", label: "Thalis" },
  { id: "healthy", label: "Healthy" },
];

// Ids p1, p2 and p4 predate the mock API; keep them stable so saved carts still match.
export const MENU_ITEMS = [
  // Burger Barn
  { id: "p1", restaurantId: "r1", title: "Cheese Burger", price: 49, category: "burger", veg: true, rating: 4.2, popular: true, img: unsplash("photo-1757834787931-ddd70f3379a5"), desc: "Juicy burger with melted cheese" },
  { id: "p4", restaurantId: "r1", title: "Chicken Burger", price: 79, category: "burger", veg: false, rating: 4.4, popular: true, img: unsplash("photo-1671106571674-a89083d27e60"), desc: "Tender chicken patty" },
  { id: "p5", restaurantId: "r1", title: "Classic Veg Burger", price: 59, category: "burger", veg: true, rating: 4.0, popular: false, img: unsplash("photo-1627587780063-1655815c958b"), desc: "Crispy veg patty, lettuce and house mayo" },
  { id: "p6", restaurantId: "r1", title: "Double Cheese Veg Burger", price: 99, category: "burger", veg: true, rating: 4.1, popular: false, img: unsplash("photo-1655895176036-bf1a11326e5c"), desc: "Two veg patties with double cheddar" },
  { id: "p7", restaurantId: "r1", title: "Crispy Fried Chicken (4 pc)", price: 199, category: "chicken", veg: false, rating: 4.5, popular: false, img: unsplash("photo-1657271511865-f610b280dca4"), desc: "Southern-style crunchy fried chicken" },
  { id: "p8", restaurantId: "r1", title: "Fried Chicken Bucket (8 pc)", price: 379, category: "chicken", veg: false, rating: 4.6, popular: false, img: unsplash("photo-1579065497397-2824d41272ce"), desc: "Party bucket with two dips" },

  // Pizza Piazza
  { id: "p2", restaurantId: "r2", title: "Pepperoni Pizza", price: 199, category: "pizza", veg: false, rating: 4.5, popular: true, img: unsplash("photo-1681158924733-784eae8a9f01"), desc: "Classic pepperoni pizza" },
  { id: "p9", restaurantId: "r2", title: "Margherita Pizza", price: 149, category: "pizza", veg: true, rating: 4.3, popular: false, img: unsplash("photo-1604068549290-dea0e4a305ca"), desc: "Wood-fired with fresh mozzarella and basil" },
  { id: "p10", restaurantId: "r2", title: "Farmhouse Veg Pizza", price: 229, category: "pizza", veg: true, rating: 4.4, popular: false, img: unsplash("photo-1743615357871-eb04cd434c6e"), desc: "Capsicum, onion, tomato and mushroom" },
  { id: "p11", restaurantId: "r2", title: "Four Cheese Pizza", price: 279, category: "pizza", veg: true, rating: 4.6, popular: false, img: unsplash("photo-1573821663912-6df460f9c684"), desc: "Mozzarella, cheddar, parmesan and gouda" },
  { id: "p12", restaurantId: "r2", title: "Paneer Tikka Pizza", price: 259, category: "pizza", veg: true, rating: 4.3, popular: false, img: unsplash("photo-1565299624946-b28f40a0ae38"), desc: "Tandoori paneer with onions and mint drizzle" },
  { id: "p13", restaurantId: "r2", title: "Chicken Tikka Pizza", price: 299, category: "pizza", veg: false, rating: 4.4, popular: false, img: unsplash("photo-1743615357618-de4ac111c79c"), desc: "Smoky chicken tikka and jalapeños" },

  // Spice Route
  { id: "p14", restaurantId: "r3", title: "Chicken Dum Biryani", price: 249, category: "biryani", veg: false, rating: 4.7, popular: true, img: unsplash("photo-1631515243349-e0cb75fb8d3a"), desc: "Slow-cooked basmati with tender chicken" },
  { id: "p15", restaurantId: "r3", title: "Family Pack Chicken Biryani", price: 549, category: "biryani", veg: false, rating: 4.6, popular: false, img: unsplash("photo-1719239885399-f87d992e0f18"), desc: "Serves 3-4, with raita and salan" },
  { id: "p16", restaurantId: "r3", title: "Chicken Seekh Kebab", price: 219, category: "kebab", veg: false, rating: 4.4, popular: false, img: unsplash("photo-1599487488170-d11ec9c172f0"), desc: "Charcoal-grilled minced chicken skewers" },
  { id: "p17", restaurantId: "r3", title: "Chicken Tikka Skewers", price: 239, category: "kebab", veg: false, rating: 4.5, popular: false, img: unsplash("photo-1755090154782-5215189b4083"), desc: "Yogurt-marinated tikka from the tandoor" },
  { id: "p18", restaurantId: "r3", title: "Chicken Kathi Roll", price: 129, category: "rolls", veg: false, rating: 4.5, popular: true, img: unsplash("photo-1632660346941-023cc64e1252"), desc: "Flaky paratha wrapped around spicy chicken" },
  { id: "p19", restaurantId: "r3", title: "Paneer Tikka Roll", price: 119, category: "rolls", veg: true, rating: 4.2, popular: false, img: unsplash("photo-1671572579845-52270341950f"), desc: "Grilled paneer, onions and green chutney" },

  // Thali House
  { id: "p20", restaurantId: "r4", title: "South Indian Thali", price: 179, category: "thali", veg: true, rating: 4.5, popular: true, img: unsplash("photo-1742281257687-092746ad6021"), desc: "Rice, sambar, rasam, poriyal, curd and papad" },
  { id: "p21", restaurantId: "r4", title: "Deluxe Veg Thali", price: 219, category: "thali", veg: true, rating: 4.4, popular: false, img: unsplash("photo-1589778655375-3e622a9fc91c"), desc: "Paneer sabzi, dal, rotis, rice and dessert" },
  { id: "p22", restaurantId: "r4", title: "Mini Veg Thali", price: 139, category: "thali", veg: true, rating: 4.1, popular: false, img: unsplash("photo-1546833999-b9f581a1996d"), desc: "Dal, sabzi, 2 rotis and jeera rice" },
  { id: "p23", restaurantId: "r4", title: "Masala Daliya", price: 99, category: "healthy", veg: true, rating: 4.0, popular: false, img: unsplash("photo-1630409351211-d62ab2d24da4"), desc: "Broken wheat cooked with vegetables and spices" },
  { id: "p24", restaurantId: "r4", title: "Protein Daliya Bowl", price: 129, category: "healthy", veg: true, rating: 4.2, popular: false, img: unsplash("photo-1623428187425-873f16e10554"), desc: "Daliya with sprouts, paneer and seeds" },
];

const STYLES = ["Classic", "Spicy", "Smoky", "Tandoori", "Peri Peri", "Garlic", "Masala", "Herb", "Cheesy", "Chef's Special", "Desi", "Royal"];
const PORTIONS = [
  { label: "Regular", factor: 1 },
  { label: "Large", factor: 1.4 },
  { label: "Combo", factor: 1.7 },
  { label: "Mini", factor: 0.75 },
];

function seeded(n) {
  const x = Math.sin(n * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

const BASE_ITEMS = MENU_ITEMS.slice();
let counter = 100;
outer: for (const style of STYLES) {
  for (const portion of PORTIONS) {
    for (const base of BASE_ITEMS) {
      if (BASE_ITEMS.length + counter - 100 >= 1000) break outer;
      const r = seeded(counter);
      MENU_ITEMS.push({
        ...base,
        id: `g${counter}`,
        title: `${style} ${base.title} (${portion.label})`,
        price: Math.max(39, Math.round((base.price * portion.factor + r * 40) / 5) * 5 - 1),
        rating: Math.round((3.6 + r * 1.3) * 10) / 10,
        popular: false,
        desc: `${base.desc}. ${portion.label} portion, ${style.toLowerCase()} style.`,
      });
      counter++;
    }
  }
}
