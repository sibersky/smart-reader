// src/components/Footer.tsx
import React from 'react';

interface FooterProps {
  siteName: string;
  startYear?: number;
  className?: string;
}

const Footer: React.FC<FooterProps> = ({
  siteName,
  startYear,
  className = '',
}) => {
  const currentYear = new Date().getFullYear();
  const yearDisplay = startYear && startYear !== currentYear 
    ? `${startYear} - ${currentYear}` 
    : currentYear;

  // Use semantic classes derived from theme.css variables
  const baseStyle = `
    py-8 text-center border-t border-border-secondary bg-[color:var(--color-brand-300)]
  `;
  const textStyle = `
    text-sm text-neutral-900
  `;

  return (
    <footer className={`${baseStyle} ${className}`}>
      <p className={textStyle}>
        © <span suppressHydrationWarning>{yearDisplay}</span> {siteName}. All rights reserved.
      </p>
    </footer>
  );
};

export default Footer;
export type { FooterProps };