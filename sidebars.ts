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
        'developers/business-plan',
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
    {
      type: 'category',
      label: 'Settlement',
      items: [
        'settlement/overview',
        'settlement/solana',
        'settlement/celo',
        'settlement/circle',
        'settlement/base',
      ],
    },
    {
      type: 'category',
      label: 'PhoneBook',
      items: [
        'phonebook/overview',
        'phonebook/off-grid-trigger',
        'phonebook/sdk',
      ],
    },
  ],
};

export default sidebars;
