import React from 'react';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
  style?: React.CSSProperties;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '20px',
  borderRadius = '8px',
  className = '',
  style = {}
}) => {
  return (
    <div 
      className={`skeleton-loader ${className}`}
      style={{ width, height, borderRadius, ...style }}
    >
      <style>{`
        .skeleton-loader {
          background: #EBE8E0;
          background: linear-gradient(
            90deg,
            #EBE8E0 25%,
            #F2F0E9 50%,
            #EBE8E0 75%
          );
          background-size: 200% 100%;
          animation: skeleton-loading 1.5s infinite ease-in-out;
        }

        @keyframes skeleton-loading {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }
      `}</style>
    </div>
  );
};
