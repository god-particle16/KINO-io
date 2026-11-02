/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface KinoLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'badge' | 'plain';
}

export const KinoLogo: React.FC<KinoLogoProps> = ({
  className = '',
  size = 'md',
}) => {
  const sizeMap = {
    sm: 'w-5.5 h-5.5 rounded-md',
    md: 'w-7.5 h-7.5 rounded-lg',
    lg: 'w-9.5 h-9.5 rounded-xl',
    xl: 'w-13 h-13 rounded-2xl',
  };

  const dimension = sizeMap[size];

  return (
    <img
      src="/assets/aistudio/KINO_app_logo_407c53e7.png"
      alt="KINO Logo"
      className={`${dimension} object-contain shrink-0 group-hover:scale-105 transition-transform duration-200 ${className}`}
    />
  );
};
