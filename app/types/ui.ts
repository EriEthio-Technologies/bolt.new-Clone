export interface LoadingStateProps {
  /** Loading message to display */
  message?: string;
  /** Size of the loading indicator */
  size?: 'small' | 'medium' | 'large';
  /** Whether to show as overlay on full screen */
  overlay?: boolean;
  /** Progress percentage (0-100) for progress variant */
  progress?: number;
  /** Type of loading indicator to display */
  variant?: 'spinner' | 'progress';
}

export interface ThemeColors {
  primary: Record<number, string>;
  gray: Record<number, string>;
}

export interface ThemeSpacing {
  [key: number]: string;
}

export interface ThemeTypography {
  size: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
}

export interface ThemeZIndex {
  modal: number;
  overlay: number;
  dropdown: number;
  tooltip: number;
}

export interface Theme {
  colors: ThemeColors;
  spacing: ThemeSpacing;
  typography: ThemeTypography;
  zIndex: ThemeZIndex;
}

export interface ProgressIndicatorProps {
  /** Current progress value (0-100) */
  value: number;
  /** Maximum value for progress */
  max?: number;
  /** Visual style variant */
  variant?: 'linear' | 'circular' | 'steps';
  /** Size of the indicator */
  size?: 'small' | 'medium' | 'large';
  /** Whether to show progress label */
  showLabel?: boolean;
  /** Custom label format function */
  labelFormatter?: (value: number, max: number) => string;
  /** Color theme */
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  /** Whether to animate progress changes */
  animate?: boolean;
  /** Array of step labels for steps variant */
  steps?: string[];
  /** Additional CSS classes */
  className?: string;
  /** Whether to show indeterminate state */
  indeterminate?: boolean;
}

export interface StepIndicatorProps {
  currentStep: number;
  steps: string[];
  orientation?: 'horizontal' | 'vertical';
  onStepClick?: (step: number) => void;
} 