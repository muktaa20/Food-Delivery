/** Seed data for the mock backend. Loaded into IndexedDB on first run. */
export const RESTAURANTS = [
  {
    id: "r1",
    name: "Burger Barn",
    cuisines: ["American", "Fast Food"],
    rating: 4.3,
    deliveryTime: 25,
    costForTwo: 300,
    img: "images/cheeseburger.jpg",
  },
  {
    id: "r2",
    name: "Pizza Piazza",
    cuisines: ["Italian", "Pizza"],
    rating: 4.5,
    deliveryTime: 35,
    costForTwo: 500,
    img: "images/vegpizza.jpg",
  },
  {
    id: "r3",
    name: "Spice Route",
    cuisines: ["North Indian", "Mughlai", "Biryani"],
    rating: 4.4,
    deliveryTime: 40,
    costForTwo: 450,
    img: "images/chickenbiryani.jpg",
  },
  {
    id: "r4",
    name: "Thali House",
    cuisines: ["South Indian", "Healthy", "Pure Veg"],
    rating: 4.2,
    deliveryTime: 30,
    costForTwo: 350,
    img: "images/vegthali.jpg",
  },
];
