window.HELP_SYSTEM_CONFIG = window.HELP_SYSTEM_CONFIG || { pages: {} };

window.HELP_SYSTEM_CONFIG.pages['clubs-manage'] = {
  clubName: {
    title: 'Club Name',
    body: '<p>The official name of your club. Only primary delegates can change this field.</p>'
  },
  state: {
    title: 'State',
    body: '<p>Select the Australian state where your club is based.</p>'
  },
  description: {
    title: 'Club Description',
    body: '<p>Provide a short description that will appear on your public profile.</p>'
  }
};

import('/js/help-system.js').then(({ default: helpSystem }) => {
  if (helpSystem && typeof helpSystem.initialize === 'function') {
    helpSystem.initialize('clubs-manage', window.HELP_SYSTEM_CONFIG.pages['clubs-manage']);
  }
}).catch(() => {});
