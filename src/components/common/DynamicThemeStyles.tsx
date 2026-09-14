import React, { useState, useEffect } from 'react';
import { db } from '../../services/db';

export const DynamicThemeStyles: React.FC = () => {
  const [settings, setSettings] = useState(() => db.getSettings());

  useEffect(() => {
    const handleUpdate = () => {
      setSettings(db.getSettings());
    };
    window.addEventListener('style1_data_changed', handleUpdate);
    return () => {
      window.removeEventListener('style1_data_changed', handleUpdate);
    };
  }, []);

  const primary = settings.theme_primary || '#0f172a';
  const secondary = settings.theme_secondary || '#ffffff';
  const accent = settings.theme_accent || '#f59e0b';
  const bg = settings.theme_background || '#f8fafc';
  const cardBg = settings.theme_card_background || '#ffffff';
  const text = settings.theme_text || '#334155';
  const heading = settings.theme_heading || '#0f172a';
  const button = settings.theme_button || '#f59e0b';
  const buttonText = settings.theme_button_text || '#0f172a';
  const border = settings.theme_border || '#e2e8f0';
  const header = settings.theme_header || '#ffffff';
  const footer = settings.theme_footer || '#0f172a';

  return (
    <style id="website-dynamic-theme-style">{`
      :root {
        --theme-primary: ${primary};
        --theme-secondary: ${secondary};
        --theme-accent: ${accent};
        --theme-background: ${bg};
        --theme-card-background: ${cardBg};
        --theme-text: ${text};
        --theme-heading: ${heading};
        --theme-button: ${button};
        --theme-button-text: ${buttonText};
        --theme-border: ${border};
        --theme-header: ${header};
        --theme-footer: ${footer};
      }

      /* Helper classes to dynamically inject configured theme colors */
      .theme-bg-primary { background-color: var(--theme-primary) !important; }
      .theme-text-primary { color: var(--theme-primary) !important; }
      .theme-border-primary { border-color: var(--theme-primary) !important; }

      .theme-bg-secondary { background-color: var(--theme-secondary) !important; }
      .theme-text-secondary { color: var(--theme-secondary) !important; }

      .theme-bg-accent { background-color: var(--theme-accent) !important; }
      .theme-text-accent { color: var(--theme-accent) !important; }

      .theme-bg-body { background-color: var(--theme-background) !important; }
      
      .theme-bg-card { background-color: var(--theme-card-background) !important; }
      
      .theme-text-body { color: var(--theme-text) !important; }
      
      .theme-text-heading { color: var(--theme-heading) !important; }
      
      .theme-btn-primary { 
        background-color: var(--theme-button) !important; 
        color: var(--theme-button-text) !important; 
      }
      .theme-btn-primary:hover {
        opacity: 0.9 !important;
      }
      
      .theme-border-color { border-color: var(--theme-border) !important; }
      
      .theme-bg-header { background-color: var(--theme-header) !important; }
      
      .theme-bg-footer { background-color: var(--theme-footer) !important; }

      /* Apply dynamic styles directly to standard elements to ensure full coverage */
      body {
        background-color: var(--theme-background);
        color: var(--theme-text);
      }
      h1, h2, h3, h4, h5, h6 {
        color: var(--theme-heading);
      }
    `}</style>
  );
};
