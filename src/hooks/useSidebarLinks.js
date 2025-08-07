import {
  FaTachometerAlt,
  FaListAlt,
  FaCog,
} from "react-icons/fa";

/**
 * Build the sidebar link list according to the user's role
 * and any live count badges you want to show.
 *
 * @param {"driver"|"manager"|"owner"} role
 * @param {{ rides?: number, settlements?: number }} counts
 * @returns {Array}
 */
export default function useSidebarLinks(role = "driver", counts = {}) {
  return [
    {
      to: "/driver",
      icon: FaTachometerAlt,
      label: "Dashboard",
      end: true,
    },
    {
      to: "/driver/requests",
      icon: FaListAlt,
      label: "Rides",
      badge: counts.rides ?? 0,
    },
    {
      to: "/driver/settings",
      icon: FaCog,
      label: "Settings",
    },
  ].filter(Boolean);
}