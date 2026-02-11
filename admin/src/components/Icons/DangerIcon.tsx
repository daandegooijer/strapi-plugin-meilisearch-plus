import React from 'react';

interface DangerIconProps {
  size?: number;
  color?: string;
}

const DangerIcon: React.FC<DangerIconProps> = ({ size = 16, color = 'currentColor' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polygon points="12 2 22 20 2 20"></polygon>
  </svg>
);

export default DangerIcon;
