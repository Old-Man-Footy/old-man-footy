window.HELP_SYSTEM_CONFIG = window.HELP_SYSTEM_CONFIG || { pages: {} };

window.HELP_SYSTEM_CONFIG.pages['sponsors-list'] = {
  default: {
    title: 'Sponsors',
    body: '<p>This area lists sponsors, their tiers, and contact info. Use the filters to find sponsors by state or level.</p>'
  },
  addSponsor: {
    title: 'Add Sponsor',
    body: '<p>Click "Add Sponsor" to create a new sponsor entry. Admins and primary delegates can add sponsors.</p>'
  }
};

import('/js/help-system.js').then(({ default: helpSystem }) => {
  if (helpSystem && typeof helpSystem.initialize === 'function') {
    helpSystem.initialize('sponsors-list', window.HELP_SYSTEM_CONFIG.pages['sponsors-list']);
  }
}).catch(() => {});
