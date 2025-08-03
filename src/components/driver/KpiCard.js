import React from "react";
import { motion } from "framer-motion";
import { FaArrowUp, FaArrowDown } from "react-icons/fa";

const KpiCard = ({ title, value, delta }) => {
  const negative = delta.trim().startsWith("-");

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300 }}
      className="bg-white dark:bg-gray-800 shadow rounded-lg p-4"
    >
      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
        {title}
      </h3>

      <p className="mt-2 text-2xl font-semibold">{value}</p>

      <p
        className={`mt-1 flex items-center gap-1 text-sm ${
          negative ? "text-red-500" : "text-emerald-500"
        }`}
      >
        {negative ? <FaArrowDown /> : <FaArrowUp />}
        {delta}
      </p>
    </motion.div>
  );
};

export default KpiCard;