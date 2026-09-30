/** Shared site footer, rendered into <footer id="site-footer">. Hosts the #contact anchor. */
import { $ } from "../utils/dom.js";

export function initFooter() {
  const mount = $("#site-footer");
  if (!mount) return;

  mount.innerHTML = `
    <div class="wraper footer-grid" id="contact">
      <div>
        <a href="index.html" class="logo">Foodie.</a>
        <p class="small">Delicious food, delivered fast.</p>
      </div>
      <div>
        <h4>Explore</h4>
        <ul>
          <li><a href="menu.html">Menu</a></li>
          <li><a href="cart.html">Cart</a></li>
          <li><a href="index.html#services">Services</a></li>
        </ul>
      </div>
      <div>
        <h4>Contact</h4>
        <ul>
          <li><i class="fa-solid fa-envelope"></i> <a href="mailto:hello@foodie.example">hello@foodie.example</a></li>
          <li><i class="fa-solid fa-phone"></i> <a href="tel:+911234567890">+91 12345 67890</a></li>
        </ul>
      </div>
    </div>
    <p class="footer-bottom">&copy; ${new Date().getFullYear()} Foodie. All rights reserved.</p>
  `;
}
