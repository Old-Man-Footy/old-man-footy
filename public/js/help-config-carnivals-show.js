// Help config for Carnival Show page
window.HELP_SYSTEM_CONFIG = window.HELP_SYSTEM_CONFIG || { pages: {} };

window.HELP_SYSTEM_CONFIG.pages['carnival-show'] = {
  sections: {
    'date': {
      title: 'Event Date & Time',
      content: '<p>The official date and time for the carnival. If the date is marked as TBA, the organiser will update it when confirmed.</p>'
    },
    'location': {
      title: 'Location & Venue',
      content: '<p>Full address and venue information. Provide GPS coordinates for better mapping and MySideline compatibility.</p>'
    },
    'registration': {
      title: 'Registration',
      content: '<p>Follow the registration link to register players or teams. MySideline-imported events will direct you to MySideline for official registration.</p>'
    }
  }
};

import('/js/help-system.js').then(m => {
  if (window.helpSystem && typeof window.helpSystem.initialize === 'function') {
    window.helpSystem.initialize('carnival-show', window.HELP_SYSTEM_CONFIG.pages['carnival-show']);
  }
});
