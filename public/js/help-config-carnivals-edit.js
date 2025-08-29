// Help config for Carnival Edit page
window.HELP_SYSTEM_CONFIG = window.HELP_SYSTEM_CONFIG || { pages: {} };

window.HELP_SYSTEM_CONFIG.pages['carnival-edit'] = {
  sections: {
    'basic-info': {
      title: 'Basic Information',
      content: '<p>Enter the carnival title, date, and state. Use the end date field for multi-day events.</p>'
    },
    'mysideline': {
      title: 'MySideline Integration',
      content: '<p>Enter the MySideline Event ID to auto-generate the registration link. Use this to keep registrations synchronized.</p>'
    },
    'location-details': {
      title: 'Detailed Location',
      content: '<p>Provide venue name, suburb, postcode and GPS coordinates to improve mapping and MySideline matching.</p>'
    }
  }
};

import('/js/help-system.js').then(m => {
  if (window.helpSystem && typeof window.helpSystem.initialize === 'function') {
    window.helpSystem.initialize('carnival-edit', window.HELP_SYSTEM_CONFIG.pages['carnival-edit']);
  }
});
