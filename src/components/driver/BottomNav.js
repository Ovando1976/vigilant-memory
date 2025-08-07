import React from 'react';
import { FaUsers, FaDollarSign, FaCog } from 'react-icons/fa';

export const BottomNav = () => (
  <nav
    className="fixed bottom-0 inset-x-0 z-40 bg-white dark:bg-gray-900
                  border-t border-gray-200 dark:border-gray-700
                  flex justify-around py-2 md:hidden"
  >
    <NavItem icon={<FaUsers />} label="Requests" href="/driver" />
    <NavItem icon={<FaDollarSign />} label="Earnings" href="/driver/earnings" />
    <NavItem icon={<FaCog />} label="Settings" href="/driver/settings" />
  </nav>
);

const NavItem = ({ icon, label, href }) => (
  <a href={href} className="flex flex-col items-center text-xs">
    <span className="text-lg">{icon}</span>
    {label}
  </a>
);
