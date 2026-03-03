export type ViewType = "mobile" | "desktop" | "tablet";

export interface ViewportConfig {
  width: number;
  height: number;
  deviceScaleFactor?: number;
  isMobile?: boolean;
  isLandscape?: boolean;
  hasTouch?: boolean;
  isDesktop?: boolean;
}

export const VIEWPORTS: Record<ViewType, ViewportConfig> = {
  mobile: {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    isLandscape: false,
  },
  tablet: {
    width: 768,
    height: 1024,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    isLandscape: false,
  },
  desktop: {
    width: 1920,
    height: 1080,
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
    isDesktop: true,
  },
};
