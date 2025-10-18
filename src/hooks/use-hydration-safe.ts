'use client';

import { useEffect, useState } from 'react';

export function useHydrationSafe() {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Clean up any extension attributes immediately
    const cleanup = () => {
      const allElements = document.querySelectorAll('*');
      allElements.forEach(el => {
        if (el instanceof HTMLElement) {
          // Remove common extension attributes
          const extensionAttrs = ['bis_register', '__processed_', 'bis_skin_checked'];
          extensionAttrs.forEach(attr => {
            if (el.hasAttribute(attr)) {
              el.removeAttribute(attr);
            }
          });
          
          // Remove any attribute starting with bis_ or __processed
          Array.from(el.attributes).forEach(attr => {
            if (attr.name.startsWith('bis_') || attr.name.startsWith('__processed')) {
              el.removeAttribute(attr.name);
            }
          });
        }
      });
    };

    // Run cleanup immediately
    cleanup();
    
    // Set hydrated state
    setIsHydrated(true);
    
    // Run cleanup periodically
    const interval = setInterval(cleanup, 50);
    
    return () => clearInterval(interval);
  }, []);

  return isHydrated;
}
