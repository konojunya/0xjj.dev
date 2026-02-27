'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { motion, useSpring, useTransform } from 'motion/react';
import Image from 'next/image';
import { useRef, useState } from 'react';

interface Props extends React.ComponentProps<typeof Image> {
  src: string;
  backSrc: string;
  maxTilt?: number;
}

export const TiltCard: React.FC<Props> = ({
  src,
  backSrc,
  maxTilt = 30,
  ...props
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const z = useSpring(0);
  const rotateX = useSpring(0);
  const rotateY = useSpring(0);
  const flipRotateY = useSpring(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [hasFlippedThisGesture, setHasFlippedThisGesture] = useState(false);

  const backRotateY = useTransform(flipRotateY, (value) => value + 180);

  const tiltThreshold = maxTilt * 0.6;
  const tiltYThreshold = maxTilt * 0.3;
  const releaseThreshold = maxTilt * 0.3;

  const calculateTilt = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!cardRef.current) return { rotateX: 0, rotateY: 0 };

    const rect = cardRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const xPercent = x / rect.width;
    const yPercent = y / rect.height;

    const tiltX = maxTilt * (0.5 - yPercent);
    const tiltY = maxTilt * (xPercent - 0.5);

    const tiltMagnitude = Math.sqrt(tiltX ** 2 + tiltY ** 2);
    const tiltXAbs = Math.abs(tiltX);
    const tiltYAbs = Math.abs(tiltY);

    const shouldFlip =
      tiltMagnitude > tiltThreshold ||
      tiltXAbs > tiltThreshold ||
      tiltYAbs > tiltYThreshold;

    const canFlipAgain =
      tiltMagnitude < releaseThreshold &&
      tiltXAbs < releaseThreshold &&
      tiltYAbs < releaseThreshold * 0.8;

    if (shouldFlip && !hasFlippedThisGesture) {
      setIsFlipped(!isFlipped);
      flipRotateY.set(isFlipped ? 0 : 180);
      setHasFlippedThisGesture(true);
    } else if (canFlipAgain && hasFlippedThisGesture) {
      setHasFlippedThisGesture(false);
    }

    return { rotateX: tiltX, rotateY: tiltY };
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setIsFlipped(false);
      flipRotateY.set(0);
      setHasFlippedThisGesture(false);
      rotateX.set(0);
      rotateY.set(0);
      z.set(0);
    }
  };

  return (
    <Dialog onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          className="h-full w-full p-0"
          style={{
            outline: 'none',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <Image
            src={src}
            width={430}
            height={600}
            className="aspect-trading-card w-full"
            {...props}
          />
        </Button>
      </DialogTrigger>
      <DialogContent className="m-0 flex h-fit max-h-4/5 w-fit max-w-4/5 items-center justify-center rounded-none border-none bg-transparent p-0 shadow-none outline-none [&>button:last-child]:hidden">
        <DialogTitle hidden />
        <DialogDescription hidden />
        <motion.div
          ref={cardRef}
          className="aspect-trading-card"
          style={{
            ...styles.card,
            width: 400,
            z,
            rotateX,
            rotateY,
            outline: 'none',
            transformStyle: 'preserve-3d',
          }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          onPointerMove={(e) => {
            const tilt = calculateTilt(e);
            rotateX.set(tilt.rotateX);
            rotateY.set(tilt.rotateY);
          }}
          onPointerLeave={() => {
            rotateX.set(0);
            rotateY.set(0);
            z.set(0);
            setHasFlippedThisGesture(false);
          }}
          onPointerEnter={() => {
            z.set(-10);
          }}
        >
          <motion.div
            style={{
              ...styles.cardFace,
              rotateY: flipRotateY,
            }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          >
            <Image
              src={src}
              alt=""
              width={300}
              height={417}
              quality={100}
              className="h-full w-full object-cover outline-none"
              style={{ outline: 'none' }}
            />
          </motion.div>
          <motion.div
            style={{
              ...styles.cardFace,
              rotateY: backRotateY,
            }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          >
            <Image
              src={backSrc}
              alt=""
              width={300}
              height={417}
              quality={100}
              className="h-full w-full object-cover outline-none"
              style={{ outline: 'none' }}
            />
          </motion.div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};

const styles = {
  card: {
    position: 'relative',
    borderRadius: 20,
    overflow: 'visible',
    background: 'transparent',
    border: 'none',
    willChange: 'transform',
    transformPerspective: 1000,
  },
  cardFace: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backfaceVisibility: 'hidden',
    WebkitBackfaceVisibility: 'hidden',
  },
} as const;
