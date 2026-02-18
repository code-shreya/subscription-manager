import { cancellationService } from '../../modules/cancellation/cancellation.service';
import { CancellationDifficulty, CancellationMethod } from '../../db/types';

/**
 * Seed cancellation guides for popular Indian services
 */
export async function seedCancellationGuides() {
  console.log('🌱 Seeding cancellation guides...');

  const guides = [
    // Netflix India
    {
      service_name: 'Netflix India',
      service_category: 'Streaming',
      difficulty: 'easy' as CancellationDifficulty,
      estimated_time_minutes: 5,
      cancellation_methods: ['online' as CancellationMethod],
      primary_method: 'online' as CancellationMethod,
      cancellation_url: 'https://www.netflix.com/cancelplan',
      requires_login: true,
      steps: [
        {
          title: 'Log in to Netflix',
          description: 'Go to netflix.com and sign in to your account',
        },
        {
          title: 'Go to Account Settings',
          description: 'Click on your profile icon and select "Account"',
        },
        {
          title: 'Cancel Membership',
          description: 'Under "Membership & Billing", click "Cancel Membership"',
        },
        {
          title: 'Confirm Cancellation',
          description: 'Click "Finish Cancellation" to confirm',
        },
      ],
      warnings: [
        'You can continue watching until the end of your billing period',
        'Your account will be closed at the end of current billing cycle',
        'No partial refunds for unused time',
      ],
      tips: [
        'Download content before cancelling to watch later',
        'You can restart your membership anytime',
        'Your viewing history and settings are saved for 10 months',
      ],
      refund_policy: 'No refunds for partial month. Access continues until end of billing period.',
      refund_eligible_days: 0,
      pause_available: false,
      downgrade_available: true,
      last_verified: new Date('2026-02-01'),
      success_rate: 98.5,
    },

    // Disney+ Hotstar
    {
      service_name: 'Disney+ Hotstar',
      service_category: 'Streaming',
      difficulty: 'easy' as CancellationDifficulty,
      estimated_time_minutes: 5,
      cancellation_methods: ['online' as CancellationMethod, 'in_app' as CancellationMethod],
      primary_method: 'online' as CancellationMethod,
      cancellation_url: 'https://www.hotstar.com/in/subscribe',
      requires_login: true,
      steps: [
        {
          title: 'Log in to Hotstar',
          description: 'Visit hotstar.com or open the app',
        },
        {
          title: 'Open Subscription Page',
          description: 'Go to Profile > My Account > Subscription',
        },
        {
          title: 'Manage Subscription',
          description: 'Click on "Manage" next to your active plan',
        },
        {
          title: 'Cancel Auto-Renewal',
          description: 'Select "Turn off auto-renewal" and confirm',
        },
      ],
      warnings: [
        'Cancel at least 24 hours before renewal date',
        'Access continues until subscription end date',
        'No refunds after subscription starts',
      ],
      tips: [
        'Annual plans are better value than monthly',
        'Use mobile-only plan if you watch primarily on phone',
      ],
      refund_policy: 'No refunds. Access continues until subscription expires.',
      refund_eligible_days: 0,
      pause_available: false,
      downgrade_available: false,
      last_verified: new Date('2026-02-01'),
      success_rate: 96.0,
    },

    // Amazon Prime India
    {
      service_name: 'Amazon Prime',
      service_category: 'Streaming',
      difficulty: 'easy' as CancellationDifficulty,
      estimated_time_minutes: 5,
      cancellation_methods: ['online' as CancellationMethod],
      primary_method: 'online' as CancellationMethod,
      cancellation_url: 'https://www.amazon.in/gp/primecentral',
      requires_login: true,
      steps: [
        {
          title: 'Go to Prime Central',
          description: 'Visit amazon.in/prime and sign in',
        },
        {
          title: 'Manage Membership',
          description: 'Click "Manage Membership" under Prime Status',
        },
        {
          title: 'End Membership',
          description: 'Select "End Membership" and follow prompts',
        },
        {
          title: 'Confirm Cancellation',
          description: 'Confirm your decision to cancel',
        },
      ],
      warnings: [
        'Prime Video benefits end immediately on cancellation',
        'Fast shipping benefits end immediately',
        'Partial refunds may be available if not used',
      ],
      tips: [
        'You may be eligible for a prorated refund',
        'Consider pausing instead of cancelling',
        'Free trial can be cancelled anytime',
      ],
      refund_policy: 'Prorated refund available if Prime benefits not used recently.',
      refund_eligible_days: 30,
      pause_available: true,
      downgrade_available: false,
      last_verified: new Date('2026-02-01'),
      success_rate: 97.5,
    },

    // Spotify India
    {
      service_name: 'Spotify India',
      service_category: 'Music',
      difficulty: 'easy' as CancellationDifficulty,
      estimated_time_minutes: 3,
      cancellation_methods: ['online' as CancellationMethod],
      primary_method: 'online' as CancellationMethod,
      cancellation_url: 'https://www.spotify.com/in/account/subscription/',
      requires_login: true,
      steps: [
        {
          title: 'Log in to Spotify',
          description: 'Go to spotify.com and sign in',
        },
        {
          title: 'Go to Subscription Page',
          description: 'Visit Account > Subscription page',
        },
        {
          title: 'Cancel Premium',
          description: 'Click "Cancel Premium"',
        },
        {
          title: 'Confirm',
          description: 'Follow prompts to confirm cancellation',
        },
      ],
      warnings: [
        'Premium features end at the end of billing period',
        'No refunds for unused time',
        'Free tier available after cancellation',
      ],
      tips: [
        'Download playlists before cancelling if you want offline access',
        'You can reactivate Premium anytime',
        'Free tier supported by ads',
      ],
      refund_policy: 'No refunds. Premium access until end of billing period.',
      refund_eligible_days: 0,
      pause_available: false,
      downgrade_available: true,
      last_verified: new Date('2026-02-01'),
      success_rate: 99.0,
    },

    // YouTube Premium
    {
      service_name: 'YouTube Premium',
      service_category: 'Streaming',
      difficulty: 'easy' as CancellationDifficulty,
      estimated_time_minutes: 5,
      cancellation_methods: ['online' as CancellationMethod, 'in_app' as CancellationMethod],
      primary_method: 'online' as CancellationMethod,
      cancellation_url: 'https://www.youtube.com/paid_memberships',
      requires_login: true,
      steps: [
        {
          title: 'Sign in to YouTube',
          description: 'Go to youtube.com and log in',
        },
        {
          title: 'Open Paid Memberships',
          description: 'Click profile icon > Purchases and memberships',
        },
        {
          title: 'Manage Membership',
          description: 'Find YouTube Premium and click "Manage"',
        },
        {
          title: 'Cancel Membership',
          description: 'Click "Cancel membership" and confirm',
        },
      ],
      warnings: [
        'Premium benefits end at next billing date',
        'Downloaded videos become unavailable',
        'Background play stops working',
      ],
      tips: [
        'Consider family plan for better value',
        'YouTube Music included with Premium',
      ],
      refund_policy: 'No refunds. Access continues until subscription ends.',
      refund_eligible_days: 0,
      pause_available: true,
      downgrade_available: false,
      last_verified: new Date('2026-02-01'),
      success_rate: 97.0,
    },

    // Zomato Pro/Gold
    {
      service_name: 'Zomato Pro',
      service_category: 'Food & Dining',
      difficulty: 'medium' as CancellationDifficulty,
      estimated_time_minutes: 10,
      cancellation_methods: ['email' as CancellationMethod, 'in_app' as CancellationMethod],
      primary_method: 'email' as CancellationMethod,
      support_email: 'help@zomato.com',
      email_template: `Subject: Cancellation Request - Zomato Pro Membership

Dear Zomato Support,

I would like to cancel my Zomato Pro membership.

Account Details:
Name: {userName}
Email: {userEmail}
Phone: {accountId}

Reason: {reason}

Please confirm the cancellation and ensure no further charges are made.

Thank you,
{userName}`,
      steps: [
        {
          title: 'Open Zomato App',
          description: 'Launch the Zomato app on your phone',
        },
        {
          title: 'Contact Support',
          description: 'Go to Profile > Help > Membership',
        },
        {
          title: 'Request Cancellation',
          description: 'Select "Cancel Membership" or chat with support',
        },
        {
          title: 'Follow Instructions',
          description: 'Provide required details and confirm',
        },
      ],
      warnings: [
        'Must cancel before renewal date',
        'No refunds typically',
        'Benefits end immediately',
      ],
      tips: [
        'Check if you have unused benefits',
        'Screenshot membership details before cancelling',
      ],
      refund_policy: 'Generally no refunds. Contact support for exceptions.',
      refund_eligible_days: 0,
      pause_available: false,
      downgrade_available: false,
      last_verified: new Date('2026-02-01'),
      success_rate: 85.0,
      average_response_time_hours: 24,
    },

    // Swiggy One
    {
      service_name: 'Swiggy One',
      service_category: 'Food & Dining',
      difficulty: 'medium' as CancellationDifficulty,
      estimated_time_minutes: 10,
      cancellation_methods: ['email' as CancellationMethod, 'in_app' as CancellationMethod],
      primary_method: 'in_app' as CancellationMethod,
      support_email: 'support@swiggy.in',
      steps: [
        {
          title: 'Open Swiggy App',
          description: 'Launch Swiggy on your phone',
        },
        {
          title: 'Go to Swiggy One',
          description: 'Tap on Swiggy One icon',
        },
        {
          title: 'Manage Membership',
          description: 'Scroll to bottom and tap "Manage membership"',
        },
        {
          title: 'Cancel Subscription',
          description: 'Select cancel and confirm',
        },
      ],
      warnings: [
        'Benefits end immediately upon cancellation',
        'No prorated refunds',
        'Free delivery benefits stop',
      ],
      tips: [
        'Use all benefits before cancelling',
        'Consider pausing if available',
      ],
      refund_policy: 'No refunds. Benefits end immediately.',
      refund_eligible_days: 0,
      pause_available: false,
      downgrade_available: false,
      last_verified: new Date('2026-02-01'),
      success_rate: 88.0,
    },

    // Adobe Creative Cloud
    {
      service_name: 'Adobe Creative Cloud',
      service_category: 'Software',
      difficulty: 'medium' as CancellationDifficulty,
      estimated_time_minutes: 10,
      cancellation_methods: ['online' as CancellationMethod, 'chat' as CancellationMethod],
      primary_method: 'online' as CancellationMethod,
      cancellation_url: 'https://account.adobe.com/plans',
      requires_login: true,
      steps: [
        {
          title: 'Sign in to Adobe Account',
          description: 'Go to account.adobe.com',
        },
        {
          title: 'View Plans',
          description: 'Click on "Plans" in the menu',
        },
        {
          title: 'Manage Plan',
          description: 'Select "Manage plan" for your subscription',
        },
        {
          title: 'Cancel Plan',
          description: 'Choose "Cancel plan" and confirm',
        },
      ],
      warnings: [
        'Early cancellation fee may apply (50% of remaining contract)',
        'Annual plan paid monthly has cancellation fees',
        'Files stay accessible for 30 days',
      ],
      tips: [
        'Wait until annual contract ends to avoid fees',
        'Download all cloud files before cancelling',
        'Chat with support to negotiate fee waiver',
      ],
      refund_policy: '50% of remaining payments if cancelled early (annual plan).',
      refund_eligible_days: 14,
      pause_available: false,
      downgrade_available: true,
      last_verified: new Date('2026-02-01'),
      success_rate: 82.0,
      average_response_time_hours: 2,
    },

    // Microsoft 365
    {
      service_name: 'Microsoft 365',
      service_category: 'Software',
      difficulty: 'easy' as CancellationDifficulty,
      estimated_time_minutes: 5,
      cancellation_methods: ['online' as CancellationMethod],
      primary_method: 'online' as CancellationMethod,
      cancellation_url: 'https://account.microsoft.com/services',
      requires_login: true,
      steps: [
        {
          title: 'Sign in to Microsoft Account',
          description: 'Visit account.microsoft.com',
        },
        {
          title: 'View Services',
          description: 'Go to Services & subscriptions',
        },
        {
          title: 'Manage Subscription',
          description: 'Find Microsoft 365 and click "Manage"',
        },
        {
          title: 'Turn Off Recurring Billing',
          description: 'Select "Turn off recurring billing" and confirm',
        },
      ],
      warnings: [
        'Office apps stop working after subscription ends',
        'OneDrive storage reduced to 5GB',
        'Cannot edit files after expiration',
      ],
      tips: [
        'Download files from OneDrive before expiration',
        'You can view files in read-only mode',
        'Consider switching to free Office online',
      ],
      refund_policy: 'Prorated refund available within 30 days if unused.',
      refund_eligible_days: 30,
      pause_available: false,
      downgrade_available: true,
      last_verified: new Date('2026-02-01'),
      success_rate: 98.0,
    },

    // LinkedIn Premium
    {
      service_name: 'LinkedIn Premium',
      service_category: 'Professional',
      difficulty: 'easy' as CancellationDifficulty,
      estimated_time_minutes: 5,
      cancellation_methods: ['online' as CancellationMethod],
      primary_method: 'online' as CancellationMethod,
      cancellation_url: 'https://www.linkedin.com/premium/manage',
      requires_login: true,
      steps: [
        {
          title: 'Log in to LinkedIn',
          description: 'Go to linkedin.com and sign in',
        },
        {
          title: 'Open Premium Settings',
          description: 'Click Me icon > Settings & Privacy > Subscriptions',
        },
        {
          title: 'Cancel Premium',
          description: 'Click "Cancel subscription"',
        },
        {
          title: 'Confirm Cancellation',
          description: 'Follow prompts to confirm',
        },
      ],
      warnings: [
        'InMail credits expire immediately',
        'Premium insights no longer available',
        'Cannot see who viewed your profile',
      ],
      tips: [
        'Use remaining InMail credits before cancelling',
        'Download learning course certificates',
      ],
      refund_policy: 'No refunds. Access until end of billing period.',
      refund_eligible_days: 0,
      pause_available: false,
      downgrade_available: false,
      last_verified: new Date('2026-02-01'),
      success_rate: 97.0,
    },

    // Cult.fit
    {
      service_name: 'Cult.fit',
      service_category: 'Fitness',
      difficulty: 'medium' as CancellationDifficulty,
      estimated_time_minutes: 15,
      cancellation_methods: ['email' as CancellationMethod, 'in_app' as CancellationMethod, 'phone' as CancellationMethod],
      primary_method: 'email' as CancellationMethod,
      support_email: 'support@cult.fit',
      support_phone: '+91-80-4617-4545',
      phone_hours: 'Mon-Sun 8AM-10PM IST',
      email_template: `Subject: Membership Cancellation Request - Cult.fit

Dear Cult.fit Team,

I would like to cancel my Cult.fit membership.

Membership Details:
Name: {userName}
Email: {userEmail}
Phone: {accountId}
Membership Type: {planName}

Reason for cancellation: {reason}

Please process this cancellation and confirm. Also, please provide details on any refund eligibility.

Thank you,
{userName}`,
      steps: [
        {
          title: 'Contact Support',
          description: 'Email support@cult.fit or call support',
        },
        {
          title: 'Provide Details',
          description: 'Share membership ID and cancellation reason',
        },
        {
          title: 'Request Confirmation',
          description: 'Ask for written confirmation of cancellation',
        },
        {
          title: 'Follow Up',
          description: 'Ensure cancellation is processed',
        },
      ],
      warnings: [
        'May require notice period (check membership terms)',
        'No shows and cancellations may affect refund',
        'Freeze option may be better than cancellation',
      ],
      tips: [
        'Check if you can freeze membership instead',
        'Refund policy varies by membership type',
        'Keep email confirmation for records',
      ],
      refund_policy: 'Varies by membership. Contact support for details.',
      refund_eligible_days: 7,
      pause_available: true,
      downgrade_available: true,
      last_verified: new Date('2026-02-01'),
      success_rate: 78.0,
      average_response_time_hours: 48,
    },

    // Times Prime
    {
      service_name: 'Times Prime',
      service_category: 'Lifestyle',
      difficulty: 'hard' as CancellationDifficulty,
      estimated_time_minutes: 20,
      cancellation_methods: ['email' as CancellationMethod, 'phone' as CancellationMethod],
      primary_method: 'email' as CancellationMethod,
      support_email: 'care@timesprime.com',
      support_phone: '+91-22-6202-8888',
      phone_hours: 'Mon-Sat 10AM-7PM IST',
      steps: [
        {
          title: 'Contact Customer Care',
          description: 'Email care@timesprime.com with cancellation request',
        },
        {
          title: 'Provide Membership Details',
          description: 'Include membership ID, registered mobile, and email',
        },
        {
          title: 'Wait for Response',
          description: 'Support team will respond within 48-72 hours',
        },
        {
          title: 'Confirm Cancellation',
          description: 'Follow their instructions to complete cancellation',
        },
      ],
      warnings: [
        'No refunds on annual membership',
        'Benefits end immediately upon cancellation',
        'Response time can be slow',
      ],
      tips: [
        'Use all pending benefits before cancelling',
        'Keep all email communication for records',
        'Annual plan typically non-refundable',
      ],
      refund_policy: 'No refunds on annual plans. May consider on case-by-case basis.',
      refund_eligible_days: 0,
      pause_available: false,
      downgrade_available: false,
      last_verified: new Date('2026-02-01'),
      success_rate: 65.0,
      average_response_time_hours: 72,
    },

    // MX Player
    {
      service_name: 'MX Player',
      service_category: 'Streaming',
      difficulty: 'easy' as CancellationDifficulty,
      estimated_time_minutes: 5,
      cancellation_methods: ['online' as CancellationMethod, 'in_app' as CancellationMethod],
      primary_method: 'in_app' as CancellationMethod,
      requires_login: true,
      steps: [
        {
          title: 'Open MX Player App',
          description: 'Launch MX Player on your device',
        },
        {
          title: 'Go to Settings',
          description: 'Tap profile icon and select Settings',
        },
        {
          title: 'Manage Subscription',
          description: 'Find Subscription section',
        },
        {
          title: 'Cancel Subscription',
          description: 'Tap "Cancel subscription" and confirm',
        },
      ],
      warnings: [
        'Cancel at least 24 hours before renewal',
        'No refunds for current period',
        'Ad-free experience ends with subscription',
      ],
      tips: [
        'Free tier available with ads',
        'Downloaded content expires after cancellation',
      ],
      refund_policy: 'No refunds. Access continues until end date.',
      refund_eligible_days: 0,
      pause_available: false,
      downgrade_available: true,
      last_verified: new Date('2026-02-01'),
      success_rate: 95.0,
    },
  ];

  let created = 0;
  let updated = 0;

  for (const guide of guides) {
    try {
      const existing = await cancellationService.getGuide(guide.service_name);
      await cancellationService.upsertGuide(guide);

      if (existing) {
        updated++;
        console.log(`  ✓ Updated: ${guide.service_name}`);
      } else {
        created++;
        console.log(`  + Created: ${guide.service_name}`);
      }
    } catch (error) {
      console.error(`  ✗ Failed to seed ${guide.service_name}:`, error);
    }
  }

  console.log(`\n✅ Cancellation guides seeded: ${created} created, ${updated} updated`);
}

// Run if called directly
if (require.main === module) {
  seedCancellationGuides()
    .then(() => {
      console.log('Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error seeding cancellation guides:', error);
      process.exit(1);
    });
}
