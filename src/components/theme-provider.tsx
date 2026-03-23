"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

export function ThemeProvider({ children, ...props }: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider {...props}>
      {children}
      {/* 
          Suppress React 19 hydration warning from browser extensions 
          and Next.js dev overlays 
      */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              const originalError = console.error;
              console.error = (...args) => {
                if (args[0] && typeof args[0] === 'string' && (
                  args[0].includes('Encountered a script tag while rendering React component') ||
                  args[0].includes('Hydration failed because the initial UI does not match')
                )) {
                  return;
                }
                originalError.apply(console, args);
              };
            })();
          `,
        }}
      />
    </NextThemesProvider>
  )
}
