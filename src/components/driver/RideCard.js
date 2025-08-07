import React from 'react';
import {
  FaMapMarkerAlt,
  FaFlagCheckered,
  FaUsers,
  FaDollarSign,
} from 'react-icons/fa';
import { motion } from 'framer-motion';

/* ------------------------------------------------------------------
   Presentational card – isolated, reusable
   ------------------------------------------------------------------ */
const RideCard = ({ ride, accepting = false, onAccept, className = '' }) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
      className={
        `bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 ` +
        `rounded-xl p-5 shadow-sm space-y-3 ` +
        className
      }
    >
      {/* Pickup */}
      <div className="flex items-center gap-3">
        <FaMapMarkerAlt className="text-red-500" />
        <span className="font-medium truncate">{ride.pickupText}</span>
      </div>

      {/* Drop‑off */}
      <div className="flex items-center gap-3">
        <FaFlagCheckered className="text-green-500" />
        <span className="font-medium truncate">{ride.dropoffText}</span>
      </div>

      {/* Meta */}
      <div className="flex justify-between text-sm text-gray-500">
        <span className="flex items-center gap-1">
          <FaUsers /> {ride.passengers} pax
        </span>
        <span className="flex items-center gap-1">
          <FaDollarSign /> ${ride.fare.toFixed(2)}
        </span>
      </div>

      {/* CTA */}
      <button
        onClick={() => onAccept(ride.id)}
        disabled={accepting}
        className="btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {accepting ? 'Accepting…' : 'Accept Ride'}
      </button>
    </motion.div>
  );
};

export default RideCard;
