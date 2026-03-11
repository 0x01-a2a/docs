import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    'intro',
    {
      type: 'category',
      label: 'Core Concepts',
      items: [
        'core-concepts/architecture',
        'core-concepts/communication',
        'core-concepts/agent-ownership',
        'core-concepts/reputation',
        'core-concepts/glossary',
      ],
    },
    {
      type: 'category',
      label: 'Developers',
      items: [
        'developers/getting-started',
        'developers/registration',
        'developers/node-hosting',
        'developers/skills',
        'developers/bags',
        'developers/sdk-reference',
        'developers/api-reference',
        'developers/troubleshooting',
      ],
    },
    {
      type: 'category',
      label: 'Mobile',
      items: [
        'mobile/capabilities',
        'mobile/agent-brain',
        'mobile/phone-bridge',
        'mobile/sleeping-agents',
      ],
    },
  ],
};

export default sidebars;
