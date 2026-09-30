/** Seed data for the mock backend. Loaded into IndexedDB on first run. */
import { unsplash } from "./unsplash.js";

export const RESTAURANTS = [
  {
    id: "r1",
    name: "Burger Barn",
    cuisines: ["American", "Fast Food"],
    rating: 4.3,
    deliveryTime: 25,
    costForTwo: 300,
    img: unsplash("photo-1571091718767-18b5b1457add"),
  },
  {
    id: "r2",
    name: "Pizza Piazza",
    cuisines: ["Italian", "Pizza"],
    rating: 4.5,
    deliveryTime: 35,
    costForTwo: 500,
    img: unsplash("photo-1574071318508-1cdbab80d002"),
  },
  {
    id: "r3",
    name: "Spice Route",
    cuisines: ["North Indian", "Mughlai", "Biryani"],
    rating: 4.4,
    deliveryTime: 40,
    costForTwo: 450,
    img: unsplash("photo-1714611626323-5ba6204453be"),
  },
  {
    id: "r4",
    name: "Thali House",
    cuisines: ["South Indian", "Healthy", "Pure Veg"],
    rating: 4.2,
    deliveryTime: 30,
    costForTwo: 350,
    img: unsplash("photo-1742281257707-0c7f7e5ca9c6"),
  },
];
