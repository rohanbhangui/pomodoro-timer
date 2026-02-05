// Timer positioning constants
export const TIMER_POSITION = {
  // Top position when timer is swiped up (percentage from top of container)
  TOP_OFFSET: 0,
  // Range of vertical travel for the pill (percentage of container height)
  TRAVEL_RANGE: 95, // Increased to use more vertical space
  // Padding creates the visual spacing - adjust container padding instead
} as const;

// Timer increment constants
export const TIMER_INCREMENTS = {
  // Minutes increment amount
  MINUTES_INCREMENT: 5,
  // Available seconds options (cycles through these values)
  SECONDS_OPTIONS: [0, 15, 30, 45],
} as const;

// Swipe gesture constants
export const SWIPE_GESTURE = {
  // Threshold percentage to trigger snap to top (0-1)
  SNAP_THRESHOLD: 0.5,
  // Minimum movement in pixels before considering it a swipe
  MOVEMENT_THRESHOLD: 15,
} as const;
