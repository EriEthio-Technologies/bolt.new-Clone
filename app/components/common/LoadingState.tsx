import React from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '~/hooks/useTheme';
import type { LoadingStateProps } from '~/types/ui';

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading...',
  size = 'medium',
  overlay = false,
  progress,
  variant = 'spinner'
}) => {
  const { theme } = useTheme();
  
  const containerStyles = {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing[4],
    ...(overlay && {
      position: 'fixed' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      zIndex: theme.zIndex.modal
    })
  };

  const spinnerVariants = {
    animate: {
      rotate: 360,
      transition: {
        duration: 1,
        repeat: Infinity,
        ease: 'linear'
      }
    }
  };

  const sizeMap = {
    small: '24px',
    medium: '48px',
    large: '72px'
  };

  return (
    <div
      role="alert"
      aria-busy="true"
      aria-label={message}
      style={containerStyles}
      data-testid="loading-state"
    >
      {variant === 'spinner' ? (
        <motion.div
          animate="animate"
          variants={spinnerVariants}
          style={{
            width: sizeMap[size],
            height: sizeMap[size],
            border: `4px solid ${theme.colors.primary[100]}`,
            borderTopColor: theme.colors.primary[500],
            borderRadius: '50%'
          }}
        />
      ) : (
        <motion.div
          style={{
            width: '100%',
            maxWidth: '300px',
            height: '4px',
            background: theme.colors.gray[200],
            borderRadius: '2px',
            overflow: 'hidden'
          }}
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress || 0}%` }}
            style={{
              height: '100%',
              background: theme.colors.primary[500]
            }}
            transition={{ duration: 0.3 }}
          />
        </motion.div>
      )}
      {message && (
        <p
          style={{
            marginTop: theme.spacing[3],
            color: theme.colors.gray[700],
            fontSize: theme.typography.size.sm
          }}
        >
          {message}
        </p>
      )}
    </div>
  );
}; 