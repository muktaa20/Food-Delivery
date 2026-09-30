/** Seed data for the mock backend. Loaded into IndexedDB on first run. */

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
  { id: "p1", restaurantId: "r1", title: "Cheese Burger", price: 49, category: "burger", veg: true, rating: 4.2, popular: true, img: "images/cheeseburger.jpg", desc: "Juicy burger with melted cheese" },
  { id: "p4", restaurantId: "r1", title: "Chicken Burger", price: 79, category: "burger", veg: false, rating: 4.4, popular: true, img: "images/cheeseburger.jpg", desc: "Tender chicken patty" },
  { id: "p5", restaurantId: "r1", title: "Classic Veg Burger", price: 59, category: "burger", veg: true, rating: 4.0, popular: false, img: "images/vegburger.jpg", desc: "Crispy veg patty, lettuce and house mayo" },
  { id: "p6", restaurantId: "r1", title: "Double Cheese Veg Burger", price: 99, category: "burger", veg: true, rating: 4.1, popular: false, img: "images/vegburger.jpg", desc: "Two veg patties with double cheddar" },
  { id: "p7", restaurantId: "r1", title: "Crispy Fried Chicken (4 pc)", price: 199, category: "chicken", veg: false, rating: 4.5, popular: false, img: "images/friedchicken.jpg", desc: "Southern-style crunchy fried chicken" },
  { id: "p8", restaurantId: "r1", title: "Fried Chicken Bucket (8 pc)", price: 379, category: "chicken", veg: false, rating: 4.6, popular: false, img: "images/friedchicken.jpg", desc: "Party bucket with two dips" },

  // Pizza Piazza
  { id: "p2", restaurantId: "r2", title: "Pepperoni Pizza", price: 199, category: "pizza", veg: false, rating: 4.5, popular: true, img: "images/cheesepizza.jpg", desc: "Classic pepperoni pizza" },
  { id: "p9", restaurantId: "r2", title: "Margherita Pizza", price: 149, category: "pizza", veg: true, rating: 4.3, popular: false, img: "images/rrrrr.jpg", desc: "Wood-fired with fresh mozzarella and basil" },
  { id: "p10", restaurantId: "r2", title: "Farmhouse Veg Pizza", price: 229, category: "pizza", veg: true, rating: 4.4, popular: false, img: "images/vegpizza.jpg", desc: "Capsicum, onion, tomato and mushroom" },
  { id: "p11", restaurantId: "r2", title: "Four Cheese Pizza", price: 279, category: "pizza", veg: true, rating: 4.6, popular: false, img: "images/cheesepizza.jpg", desc: "Mozzarella, cheddar, parmesan and gouda" },
  { id: "p12", restaurantId: "r2", title: "Paneer Tikka Pizza", price: 259, category: "pizza", veg: true, rating: 4.3, popular: false, img: "images/vegpizza.jpg", desc: "Tandoori paneer with onions and mint drizzle" },
  { id: "p13", restaurantId: "r2", title: "Chicken Tikka Pizza", price: 299, category: "pizza", veg: false, rating: 4.4, popular: false, img: "images/cheesepizza.jpg", desc: "Smoky chicken tikka and jalapeños" },

  // Spice Route
  { id: "p14", restaurantId: "r3", title: "Chicken Dum Biryani", price: 249, category: "biryani", veg: false, rating: 4.7, popular: true, img: "images/chickenbiryani.jpg", desc: "Slow-cooked basmati with tender chicken" },
  { id: "p15", restaurantId: "r3", title: "Family Pack Chicken Biryani", price: 549, category: "biryani", veg: false, rating: 4.6, popular: false, img: "images/chickenbiryani.jpg", desc: "Serves 3-4, with raita and salan" },
  { id: "p16", restaurantId: "r3", title: "Chicken Seekh Kebab", price: 219, category: "kebab", veg: false, rating: 4.4, popular: false, img: "images/kebab.jpg", desc: "Charcoal-grilled minced chicken skewers" },
  { id: "p17", restaurantId: "r3", title: "Chicken Tikka Skewers", price: 239, category: "kebab", veg: false, rating: 4.5, popular: false, img: "images/kebab.jpg", desc: "Yogurt-marinated tikka from the tandoor" },
  { id: "p18", restaurantId: "r3", title: "Chicken Kathi Roll", price: 129, category: "rolls", veg: false, rating: 4.5, popular: true, img: "images/roll.jpg", desc: "Flaky paratha wrapped around spicy chicken" },
  { id: "p19", restaurantId: "r3", title: "Paneer Tikka Roll", price: 119, category: "rolls", veg: true, rating: 4.2, popular: false, img: "images/roll.jpg", desc: "Grilled paneer, onions and green chutney" },

  // Thali House
  { id: "p20", restaurantId: "r4", title: "South Indian Thali", price: 179, category: "thali", veg: true, rating: 4.5, popular: true, img: "images/souththali.jpg", desc: "Rice, sambar, rasam, poriyal, curd and papad" },
  { id: "p21", restaurantId: "r4", title: "Deluxe Veg Thali", price: 219, category: "thali", veg: true, rating: 4.4, popular: false, img: "images/vegthali.jpg", desc: "Paneer sabzi, dal, rotis, rice and dessert" },
  { id: "p22", restaurantId: "r4", title: "Mini Veg Thali", price: 139, category: "thali", veg: true, rating: 4.1, popular: false, img: "images/vegthali.jpg", desc: "Dal, sabzi, 2 rotis and jeera rice" },
  { id: "p23", restaurantId: "r4", title: "Masala Daliya", price: 99, category: "healthy", veg: true, rating: 4.0, popular: false, img: "images/daliya.jpg", desc: "Broken wheat cooked with vegetables and spices" },
  { id: "p24", restaurantId: "r4", title: "Protein Daliya Bowl", price: 129, category: "healthy", veg: true, rating: 4.2, popular: false, img: "images/daliya.jpg", desc: "Daliya with sprouts, paneer and seeds" },
];
