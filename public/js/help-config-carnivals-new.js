// public/js/help-config-carnivals-new.js
// Page-specific help configuration for Carnival creation page

import { helpSystem } from './help-system.js';

window.HELP_SYSTEM_CONFIG = window.HELP_SYSTEM_CONFIG || {};
window.HELP_SYSTEM_CONFIG.pages = window.HELP_SYSTEM_CONFIG.pages || {};
window.HELP_SYSTEM_CONFIG.pages['carnivals-new'] = {
  mysideline: {
    title: 'MySideline Imported Fields',
    content: '<p>Fields marked "Imported from MySideline" are pulled from an external MySideline record. These may be read-only until you claim ownership of the event. After claiming, some fields become editable locally. Verify dates and venue details after import.</p>'
  },
  default: {
    title: 'Carnival Help',
    content: '<p>Use this form to create a new carnival. Question mark icons provide contextual guidance for each field.</p>'
  }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  const pageId = document.body && document.body.dataset && document.body.dataset.helpPage ? document.body.dataset.helpPage : 'carnivals-new';
  try {
    helpSystem.initialize(pageId, window.HELP_SYSTEM_CONFIG);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('help-config-carnivals-new: failed to initialize helpSystem', e);
  }
});
