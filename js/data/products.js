/**
 * Static product catalog and read-only query helpers.
 */

export const PRODUCTS = Object.freeze([
  {
    id: "p1",
    title: "Cheese Burger",
    price: 49,
    img: "images/cheeseburger.jpg",
    category: "burger",
    popular: true,
    desc: "Juicy burger with melted cheese",
  },
  {
    id: "p2",
    title: "Pepperoni Pizza",
    price: 199,
    img: "images/cheesepizza.jpg",
    category: "pizza",
    popular: true,
    desc: "Classic pepperoni pizza",
  },
  {
    id: "p3",
    title: "Veg Noodles",
    price: 89,
    img: "images/noodles.jpg",
    category: "noodles",
    popular: false,
    desc: "Stir-fried veg noodles",
  },
  {
    id: "p4",
    title: "Chicken Burger",
    price: 79,
    img: "images/cheeseburger.jpg",
    category: "burger",
    popular: true,
    desc: "Tender chicken patty",
  },
]);

export const findProduct = (id) => PRODUCTS.find((p) => p.id === id);

export const getPopularProducts = () => PRODUCTS.filter((p) => p.popular);

/** @param {string} category - a product category, or "all" */
export const getProductsByCategory = (category) =>
  category === "all" ? PRODUCTS : PRODUCTS.filter((p) => p.category === category);
