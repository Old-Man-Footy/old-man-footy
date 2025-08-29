// public/js/help-config-club-options.js
// Page-specific help configuration for the Club Options page (club-options)

import { helpSystem } from './help-system.js';

// Example help content for key items on the page. In practice these bodies can be loaded
// from markdown or JSON files under /docs/help-content and injected during server-render.
window.HELP_SYSTEM_CONFIG = window.HELP_SYSTEM_CONFIG || {};
window.HELP_SYSTEM_CONFIG.pages = window.HELP_SYSTEM_CONFIG.pages || {};
window.HELP_SYSTEM_CONFIG.pages['club-options'] = {
  clubName: {
    title: 'Club Name',
    content: '<p>Choose a clear and descriptive club name. Avoid abbreviations where possible to make it easy for others to find your club. If a club already exists with the same or similar name, use the autocomplete to join instead.</p>'
  },
  state: {
    title: 'State',
    content: '<p>Select the Australian state or territory where your club is based. This helps other players and delegates find clubs in their region.</p>'
  },
  description: {
    title: 'Brief Description',
    content: '<p>Write a short summary (1–2 sentences) describing the club. This will be shown on search results and the club profile to help visitors quickly understand the club.</p>'
  },
  default: {
    title: 'Club Options',
    content: '<p>Need help creating or joining a club? Use the forms on this page and the question mark icons next to each field for focused guidance.</p>'
  }
};

// Initialize the manager for this page when DOM ready. We set the page id to match the server-side body[data-help-page] attribute when available.
document.addEventListener('DOMContentLoaded', () => {
  const body = document.body;
  const pageId = body && body.dataset && body.dataset.helpPage ? body.dataset.helpPage : 'club-options';
  try {
    helpSystem.initialize(pageId, window.HELP_SYSTEM_CONFIG);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('help-config-club-options: failed to initialize helpSystem', e);
  }
});
