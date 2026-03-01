"use client"

import type { Transition, Variants } from "motion/react"
import { AnimatePresence, motion } from "motion/react"
import { useEffect, useState } from "react"

const defaultVariants: Variants = {
  initial: { y: -8, opacity: 0 },
  animate: { y: 0, opacity: 1 },
  exit: { y: 8, opacity: 0 },
}

export type TextFlipProps = {
  items: string[]
  interval?: number
  transition?: Transition
  variants?: Variants
}

export function TextFlip({
  items,
  interval = 2,
  transition = { duration: 0.3 },
  variants = defaultVariants,
}: TextFlipProps) {
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length)
    }, interval * 1000)

    return () => clearInterval(timer)
  }, [items.length, interval])

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.span
        key={currentIndex}
        style={{ display: "inline-block" }}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={transition}
        variants={variants}
      >
        {items[currentIndex]}
      </motion.span>
    </AnimatePresence>
  )
}
