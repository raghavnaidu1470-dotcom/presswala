import React, { useEffect, useState, useRef } from 'react';

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({ 
  value, 
  duration = 500,
  prefix = '',
  suffix = '',
  className = '',
  style = {}
}) => {
  const [displayValue, setDisplayValue] = useState(value);
  const [isHighlight, setIsHighlight] = useState(false);
  const prevValueRef = useRef(value);

  useEffect(() => {
    if (value === prevValueRef.current) return;
    
    // Trigger highlight flash
    setIsHighlight(true);
    const highlightTimer = setTimeout(() => setIsHighlight(false), duration + 300);

    const startValue = prevValueRef.current;
    const startTime = performance.now();
    const difference = value - startValue;

    const easeOutQuad = (t: number) => t * (2 - t);

    let animId: number;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const currentVal = Math.round(startValue + difference * easeOutQuad(progress));
      setDisplayValue(currentVal);

      if (progress < 1) {
        animId = requestAnimationFrame(animate);
      } else {
        setDisplayValue(value);
      }
    };

    animId = requestAnimationFrame(animate);
    prevValueRef.current = value;

    return () => {
      clearTimeout(highlightTimer);
      cancelAnimationFrame(animId);
    };
  }, [value, duration]);

  return (
    <span 
      className={`animated-number ${isHighlight ? 'highlight' : ''} ${className}`}
      style={style}
    >
      <style>{`
        .animated-number {
          transition: color 300ms ease, text-shadow 300ms ease;
          display: inline-block;
        }
        .animated-number.highlight {
          color: var(--customer-accent, #7BAE5C);
          text-shadow: 0 0 12px rgba(123, 174, 92, 0.4);
          transform: scale(1.05);
          transition: all 150ms ease-out;
        }
      `}</style>
      {prefix}{displayValue.toLocaleString()}{suffix}
    </span>
  );
};
