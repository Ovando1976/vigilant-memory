import { Link } from 'react-router-dom';
import './NavigationBar.css';

export default function NavigationBar() {
  return (
    <nav className="nav-bar">
      <Link className="nav-link" to="/home">Home</Link>
      <Link className="nav-link" to="/sites">Sites</Link>
      <Link className="nav-link" to="/routes">Map</Link> {/* was /map */}
      <Link className="nav-link" to="/ridesharing/request">Ride</Link> {/* was /ride */}
      <Link className="nav-link" to="/donate">Donate</Link>
      <Link className="nav-link" to="/checkout">Checkout</Link>
      <Link className="nav-link" to="/explore">Explore</Link> {/* keep a single /explore */}
    </nav>
  );
}