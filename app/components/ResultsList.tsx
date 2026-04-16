"use client";

import { motion } from "framer-motion";
import TeeTimeCard from "./TeeTimeCard";
import { ResultTeeTime } from "@/lib/types";

interface ResultsListProps {
  results: ResultTeeTime[];
}

export default function ResultsList({ results }: ResultsListProps) {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
    >
      {results.map((teeTime, index) => (
        <TeeTimeCard key={teeTime.id} teeTime={teeTime} index={index} />
      ))}
    </motion.div>
  );
}
