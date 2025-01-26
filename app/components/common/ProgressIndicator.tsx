import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '~/hooks/useTheme';
import { UIMonitor } from '~/lib/services/monitoring/UIMonitor';
import type { ProgressIndicatorProps } from '~/types/ui';

const defaultLabelFormatter = (value: number, max: number): string => 
  `${Math.round((value / max) * 100)}%`;

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  value,
  max = 100,
  variant = 'linear',
  size = 'medium',
  showLabel = true,
  labelFormatter = defaultLabelFormatter,
  color = 'primary',
  animate = true,
  steps = [],
  className = '',
  indeterminate = false
}) => {
  const { theme } = useTheme();
  const startTime = useRef(Date.now());
  const uiMonitor = useRef(new UIMonitor());

  useEffect(() => {
    return () => {
      // Track progress indicator performance
      uiMonitor.current.trackLoadingState({
        component: 'ProgressIndicator',
        duration: Date.now() - startTime.current,
        variant,
        hasOverlay: false
      }).catch(console.error);
    };
  }, [variant]);

  const normalizedValue = Math.min(Math.max(0, value), max);
  const percentage = (normalizedValue / max) * 100;

  const sizeMap = {
    small: { width: '120px', height: '4px' },
    medium: { width: '200px', height: '8px' },
    large: { width: '300px', height: '12px' }
  };

  const colorMap = {
    primary: theme.colors.primary[500],
    secondary: theme.colors.secondary[500],
    success: theme.colors.success[500],
    warning: theme.colors.warning[500],
    error: theme.colors.error[500]
  };

  const renderLinearProgress = () => (
    <div
      className={`progress-linear ${className}`}
      style={{
        width: sizeMap[size].width,
        height: sizeMap[size].height,
        backgroundColor: theme.colors.gray[200],
        borderRadius: theme.borderRadius.full,
        overflow: 'hidden'
      }}
    >
      <motion.div
        initial={{ width: 0 }}
        animate={indeterminate ? 
          {
            x: ['-100%', '100%'],
            transition: {
              repeat: Infinity,
              duration: 1.5,
              ease: 'linear'
            }
          } : 
          { width: `${percentage}%` }
        }
        style={{
          height: '100%',
          backgroundColor: colorMap[color],
          borderRadius: 'inherit'
        }}
        transition={animate ? { duration: 0.3 } : { duration: 0 }}
      />
    </div>
  );

  const renderCircularProgress = () => {
    const size = {
      small: 32,
      medium: 48,
      large: 64
    }[size];
    const strokeWidth = size * 0.1;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;

    return (
      <div className={`progress-circular ${className}`}>
        <motion.svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{ transform: 'rotate(-90deg)' }}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={theme.colors.gray[200]}
            strokeWidth={strokeWidth}
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={colorMap[color]}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{
              strokeDashoffset: indeterminate ?
                [circumference, 0] :
                circumference - (percentage / 100) * circumference
            }}
            transition={indeterminate ?
              {
                repeat: Infinity,
                duration: 1.5,
                ease: 'linear'
              } :
              animate ? { duration: 0.3 } : { duration: 0 }
            }
          />
        </motion.svg>
      </div>
    );
  };

  const renderStepsProgress = () => (
    <div
      className={`progress-steps ${className}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: theme.spacing[2]
      }}
    >
      {steps.map((step, index) => {
        const isCompleted = index < value;
        const isCurrent = index === value;

        return (
          <div
            key={index}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing[2]
            }}
          >
            <motion.div
              animate={{
                backgroundColor: isCompleted || isCurrent ?
                  colorMap[color] :
                  theme.colors.gray[200],
                scale: isCurrent ? 1.2 : 1
              }}
              style={{
                width: '16px',
                height: '16px',
                borderRadius: '50%'
              }}
              transition={{ duration: 0.2 }}
            />
            {index < steps.length - 1 && (
              <div
                style={{
                  width: '32px',
                  height: '2px',
                  backgroundColor: isCompleted ?
                    colorMap[color] :
                    theme.colors.gray[200]
                }}
              />
            )}
            {step && (
              <span
                style={{
                  color: isCurrent ?
                    colorMap[color] :
                    theme.colors.gray[700],
                  fontSize: theme.typography.size.sm
                }}
              >
                {step}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={indeterminate ? undefined : normalizedValue}
      aria-valuetext={indeterminate ? 'Loading...' : labelFormatter(normalizedValue, max)}
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: theme.spacing[2]
      }}
    >
      {variant === 'linear' && renderLinearProgress()}
      {variant === 'circular' && renderCircularProgress()}
      {variant === 'steps' && renderStepsProgress()}
      {showLabel && !indeterminate && (
        <span
          style={{
            color: theme.colors.gray[700],
            fontSize: theme.typography.size.sm
          }}
        >
          {labelFormatter(normalizedValue, max)}
        </span>
      )}
    </div>
  );
}; 