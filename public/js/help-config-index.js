window.HELP_SYSTEM_CONFIG = window.HELP_SYSTEM_CONFIG || { pages: {} };

window.HELP_SYSTEM_CONFIG.pages['index'] = {
  default: {
    title: 'Welcome to Old Man Footy',
    body: '<p>Use the navigation to find carnivals, clubs and sponsors. Click the calendar to view upcoming events.</p>'
  },
  upcomingCarnivals: {
    title: 'Upcoming Carnivals',
    body: '<p>Browse upcoming carnivals and click through to see schedules, registration links, and hosting clubs.</p>'
  }
};

import('/js/help-system.js').then(({ default: helpSystem }) => {
  if (helpSystem && typeof helpSystem.initialize === 'function') {
    helpSystem.initialize('index', window.HELP_SYSTEM_CONFIG.pages['index']);
  }
}).catch(() => {});
