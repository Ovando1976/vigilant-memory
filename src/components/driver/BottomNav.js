import React from "react";

import { FaUsers, FaCog } from "react-icons/fa";

import { FaUsers, FaDollarSign, FaCog } from "react-icons/fa";
import { NavLink } from "react-router-dom";


export const BottomNav = () => (
  <nav
    className="fixed bottom-0 inset-x-0 z-40 bg-white dark:bg-gray-900
                  border-t border-gray-200 dark:border-gray-700
                  flex justify-around py-2 md:hidden"
  >

    <NavItem icon={<FaUsers />} label="Requests" href="/driver" />
    <NavItem icon={<FaCog />} label="Settings" href="/driver/settings" />
    <NavItem icon={<FaUsers />} label="Requests" to="/driver" end />
    <NavItem icon={<FaDollarSign />} label="Earnings" to="/driver/earnings" />
    <NavItem icon={<FaCog />} label="Settings" to="/driver/settings" />

  </nav>
);

const NavItem = ({ icon, label, to, end }) => (
  <NavLink
    to={to}
    end={end}
    className={({ isActive }) =>
      `flex flex-col items-center text-xs ${
        isActive
          ? "text-blue-600 dark:text-blue-400"
          : "text-gray-600 dark:text-gray-300"
      }`
    }
  >
    <span className="text-lg">{icon}</span>
    {label}
  </NavLink>
);
