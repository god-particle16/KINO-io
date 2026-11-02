/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Star } from 'lucide-react';

interface RatingStarsProps {
  rating: number; // 0 to 5.0
  maxStars?: number;
  interactive?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  onChange?: (rating: number) => void;
  showNumeric?: boolean;
}

export const RatingStars: React.FC<RatingStarsProps> = ({
  rating,
  maxStars = 5,
  interactive = false,
  size = 'sm',
  onChange,
  showNumeric = false,
}) => {
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const displayRating = hoverRating !== null ? hoverRating : rating;

  const sizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>, starIndex: number) => {
    if (!interactive || !onChange) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const isHalf = x < rect.width / 2;
    const newRating = isHalf ? starIndex - 0.5 : starIndex;
    setHoverRating(newRating);
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>, starIndex: number) => {
    if (!interactive || !onChange) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const isHalf = x < rect.width / 2;
    const newRating = isHalf ? starIndex - 0.5 : starIndex;
    onChange(newRating === rating ? 0 : newRating); // toggle to 0 if clicking same
  };

  return (
    <div className="inline-flex items-center gap-1.5" onMouseLeave={() => setHoverRating(null)}>
      <div className="flex items-center gap-0.5">
        {Array.from({ length: maxStars }, (_, i) => {
          const starValue = i + 1;
          const isFull = displayRating >= starValue;
          const isHalf = !isFull && displayRating >= starValue - 0.5;

          const StarIcon = (
            <div className="relative inline-block">
              {/* Background empty star */}
              <Star
                className={`${sizeClasses[size]} text-slate-700/70`}
                strokeWidth={1.5}
              />
              {/* Foreground filled/half star */}
              {(isFull || isHalf) && (
                <div
                  className="absolute inset-0 overflow-hidden text-amber-400"
                  style={{ width: isFull ? '100%' : '50%' }}
                >
                  <Star
                    className={`${sizeClasses[size]} fill-amber-400 text-amber-400`}
                    strokeWidth={1.5}
                  />
                </div>
              )}
            </div>
          );

          if (!interactive) {
            return (
              <span key={i} className="inline-block leading-none">
                {StarIcon}
              </span>
            );
          }

          return (
            <button
              key={i}
              type="button"
              className="p-0.5 focus:outline-none hover:scale-110 transition-transform cursor-pointer"
              onMouseMove={(e) => handleMouseMove(e, starValue)}
              onClick={(e) => handleClick(e, starValue)}
              aria-label={`Rate ${starValue} stars`}
            >
              {StarIcon}
            </button>
          );
        })}
      </div>

      {showNumeric && displayRating > 0 && (
        <span className="font-mono text-xs tabular-nums text-amber-400/90 font-medium ml-0.5">
          {displayRating.toFixed(1)}
        </span>
      )}
    </div>
  );
};
