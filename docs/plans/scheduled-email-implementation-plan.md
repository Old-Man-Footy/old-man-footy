# Scheduled Email Implementation Plan

**Project:** Old Man Footy - Scheduled Email Notifications  
**Created:** September 29, 2025  
**Status:** Planning Phase  

## Overview

Implement a comprehensive scheduled email notification system that builds upon the existing email infrastructure to provide automated carnival reminders, registration deadline notifications, and newsletter functionality.

## Current State Analysis

### ✅ Existing Infrastructure
- [x] **BaseEmailService** - Gmail transport with feature flags
- [x] **CarnivalEmailService** - Carnival notification templates with three types:
  - `'new'` - New carnival announcements
  - `'updated'` - Carnival update notifications  
  - `'merged'` - MySideline data integration notifications
- [x] **EmailSubscription** model - State-based subscriber management with active filtering
- [x] **node-cron** package - Already installed for maintenance tasks
- [x] **Environment-based configuration** - Feature flags and settings
- [x] **Unsubscribe system** - Token-based with database tracking and headers
- [x] **Spam protection mechanisms** - State filtering, feature flags, unsubscribe options

### 🚨 Current Email Status
**IMPORTANT:** Carnival update notifications are currently **DISABLED** to prevent spam. The system has this commented-out code in `controllers/carnival.controller.mjs`:

```javascript
// Send notification emails to subscribers
// TODO: make this so it sends a weekly summary, not one email for every new carnival.
// await emailService.notifyNewCarnival(carnival);
```

This means no automatic emails are sent when carnivals are created or updated, which prevents spam but also means subscribers aren't getting notifications.

### ❌ Missing Components
- [ ] Email scheduling service (critical for enabling notifications safely)
- [ ] **Weekly digest system** (specifically mentioned in TODO comment)
- [ ] Campaign tracking and analytics
- [ ] Email queue management
- [ ] Batch processing for large subscriber lists
- [ ] Automated reminder workflows
- [ ] Newsletter template system
- [ ] **Frequency capping** to prevent individual carnival spam

## Implementation Phases

### Phase 1: Core Scheduling Infrastructure
**Duration:** 1-2 weeks  
**Priority:** HIGH - Required to safely re-enable carnival notifications

#### Database Schema Updates
- [ ] Create `EmailCampaign` model
  - [ ] Campaign ID, name, type, status
  - [ ] Scheduling configuration (cron pattern, timezone)
  - [ ] Template and content management
  - [ ] Target audience filters (state-based, matching existing EmailSubscription filtering)
- [ ] Create `ScheduledEmail` model
  - [ ] Individual email tracking
  - [ ] Send status, timestamps, error logging
  - [ ] Subscriber and campaign relationships
- [ ] Create migration files for new tables

#### Email Scheduler Service
- [ ] Create `EmailSchedulerService.mjs`
  - [ ] Cron job management and registration
  - [ ] Campaign execution logic leveraging existing `CarnivalEmailService`
  - [ ] Error handling and retry mechanisms
  - [ ] Rate limiting to prevent Gmail API abuse
  - [ ] **Frequency capping per subscriber** (critical for spam prevention)
- [ ] Integration with existing `BaseEmailService` and `CarnivalEmailService`
- [ ] Logging and monitoring capabilities

#### **Priority: Weekly Digest System**
- [ ] **Weekly Carnival Digest** - Addresses the TODO comment to prevent spam
  - [ ] Aggregate new/updated carnivals from the past week
  - [ ] State-based filtering using existing EmailSubscription logic
  - [ ] Utilizes existing unsubscribe system
  - [ ] Template builds on existing carnival notification HTML structure
- [ ] **Immediate Goal:** Replace the disabled individual carnival notifications
- [ ] **Enable safe carnival notifications** by uncommenting the disabled code once digest is ready

#### Secondary Campaign Types (Lower Priority)
- [ ] **Carnival Reminders** - 7 days, 3 days, 1 day before events
- [ ] **Registration Deadlines** - 14 days, 7 days, 2 days before closing

### Phase 2: Advanced Campaign Management
**Duration:** 2-3 weeks  
**Priority:** Medium

#### Admin Interface
- [ ] Campaign creation and management UI
  - [ ] Campaign wizard with template selection
  - [ ] Audience targeting options
  - [ ] Schedule configuration interface
  - [ ] Preview and test email functionality
- [ ] Campaign dashboard and analytics
  - [ ] Send statistics and open rates
  - [ ] Subscriber engagement metrics
  - [ ] Error reporting and resolution
- [ ] Template management system
  - [ ] Reusable email templates
  - [ ] Dynamic content insertion
  - [ ] Template versioning and rollback

#### Enhanced Scheduling Features
- [ ] **Smart Scheduling**
  - [ ] Timezone-aware delivery
  - [ ] Optimal send time detection
  - [ ] Frequency capping per subscriber
- [ ] **Conditional Logic**
  - [ ] Dynamic content based on subscriber preferences
  - [ ] A/B testing capabilities
  - [ ] Personalization tokens

#### Queue Management
- [ ] Email queue implementation
  - [ ] Batch processing for large lists
  - [ ] Priority-based sending
  - [ ] Failed email retry logic
- [ ] Rate limiting and throttling
  - [ ] Gmail API quota management
  - [ ] Subscriber-level send frequency limits
  - [ ] Peak time distribution

### Phase 3: Automated Workflows
**Duration:** 2-3 weeks  
**Priority:** Medium

#### Carnival Lifecycle Automation
- [ ] **New Carnival Announcements**
  - [ ] Automatic notification when carnivals are published
  - [ ] Location-based targeting for relevant subscribers
- [ ] **Registration Status Updates**
  - [ ] Automated confirmations and waitlist notifications
  - [ ] Payment reminder sequences
- [ ] **Event Updates**
  - [ ] Schedule changes and important announcements
  - [ ] Weather alerts and venue updates

#### Subscriber Journey Automation
- [ ] **Welcome Series**
  - [ ] Multi-part onboarding for new subscribers
  - [ ] Introduction to platform features
- [ ] **Re-engagement Campaigns**
  - [ ] Win-back inactive subscribers
  - [ ] Preference update reminders
- [ ] **Seasonal Campaigns**
  - [ ] Pre-season preparation guides
  - [ ] End-of-season summaries and feedback

### Phase 4: Analytics and Optimization
**Duration:** 1-2 weeks  
**Priority:** Low

#### Performance Monitoring
- [ ] Email delivery analytics
  - [ ] Delivery rates and bounce tracking
  - [ ] Open and click-through rates
  - [ ] Unsubscribe and spam reports
- [ ] Campaign effectiveness metrics
  - [ ] Registration conversion tracking
  - [ ] Revenue attribution from email campaigns
- [ ] System performance monitoring
  - [ ] Queue processing times
  - [ ] Error rates and resolution times

#### Optimization Features
- [ ] **Send Time Optimization**
  - [ ] Individual subscriber behavior analysis
  - [ ] Automatic optimal timing selection
- [ ] **Content Optimization**
  - [ ] A/B testing for subject lines and content
  - [ ] Template performance analysis
- [ ] **List Health Management**
  - [ ] Automatic bounce and complaint handling
  - [ ] Subscriber segmentation and targeting

## Technical Implementation Details

### Service Architecture

```javascript
// services/email/EmailSchedulerService.mjs
class EmailSchedulerService extends BaseEmailService {
  constructor() {
    super();
    this.campaigns = new Map();
    this.isRunning = false;
  }

  // Core scheduling methods
  async initializeScheduler() { }
  async registerCampaign(campaign) { }
  async executeCampaign(campaignId) { }
  async processBatch(emails) { }
}
```

### Database Models

```javascript
// models/EmailCampaign.mjs
class EmailCampaign extends Model {
  static associate(models) {
    EmailCampaign.hasMany(models.ScheduledEmail);
    EmailCampaign.belongsTo(models.User, { as: 'CreatedBy' });
  }
}

// models/ScheduledEmail.mjs  
class ScheduledEmail extends Model {
  static associate(models) {
    ScheduledEmail.belongsTo(models.EmailCampaign);
    ScheduledEmail.belongsTo(models.EmailSubscription);
  }
}
```

### Cron Integration

```javascript
// Integration with existing cron system
// Add to mySidelineIntegrationService.mjs or create new scheduler

cron.schedule('0 6 * * *', async () => {
  // Daily morning newsletter
  await emailScheduler.processDailyCampaigns();
});

cron.schedule('0 */6 * * *', async () => {
  // Process urgent reminders every 6 hours
  await emailScheduler.processUrgentReminders();
});
```

## Configuration Requirements

### Environment Variables
```bash
# Email scheduling configuration
EMAIL_SCHEDULER_ENABLED=true
EMAIL_BATCH_SIZE=50
EMAIL_RATE_LIMIT_PER_HOUR=1000
EMAIL_SCHEDULER_TIMEZONE=Australia/Sydney

# Campaign defaults
DEFAULT_CARNIVAL_REMINDER_DAYS=7,3,1
DEFAULT_REGISTRATION_REMINDER_DAYS=14,7,2
NEWSLETTER_SEND_TIME=06:00
```

### Feature Flags
- [ ] `SCHEDULED_EMAILS_ENABLED` - Master switch for all scheduled emails
- [ ] `CARNIVAL_REMINDERS_ENABLED` - Toggle carnival reminder campaigns  
- [ ] `NEWSLETTER_ENABLED` - Toggle weekly newsletter functionality
- [ ] `AUTOMATED_WORKFLOWS_ENABLED` - Toggle advanced automation features

## Testing Strategy

### Unit Tests
- [ ] EmailSchedulerService methods
- [ ] Campaign execution logic
- [ ] Queue management functionality
- [ ] Error handling and retry mechanisms

### Integration Tests
- [ ] End-to-end campaign workflow
- [ ] Database model interactions
- [ ] Email delivery verification
- [ ] Cron job execution testing

### Performance Tests
- [ ] Large batch processing
- [ ] Concurrent campaign execution
- [ ] Memory usage under load
- [ ] Gmail API rate limit handling

## Security Considerations

### Data Protection
- [ ] **Subscriber Data** - Encrypt sensitive subscriber information
- [ ] **Email Content** - Sanitize dynamic content insertion
- [ ] **Campaign Access** - Role-based permissions for campaign management

### Compliance
- [ ] **GDPR Compliance** - Consent tracking and data retention policies
- [ ] **CAN-SPAM Compliance** - Unsubscribe links and sender identification
- [ ] **Rate Limiting** - Respect Gmail API quotas and best practices

### Monitoring
- [ ] **Audit Logging** - Track all campaign creation and modifications
- [ ] **Error Alerting** - Notify administrators of critical failures
- [ ] **Abuse Prevention** - Monitor for unusual sending patterns

## Success Metrics

### Technical Metrics
- [ ] **Delivery Rate** - >95% successful delivery
- [ ] **Processing Time** - <5 minutes for batches of 1000 emails
- [ ] **System Uptime** - 99.9% scheduler availability
- [ ] **Error Rate** - <1% campaign failures

### Business Metrics  
- [ ] **Engagement Rate** - 25% open rate, 5% click-through rate
- [ ] **Registration Conversions** - 10% increase from email campaigns
- [ ] **Subscriber Growth** - 20% quarterly growth in active subscribers
- [ ] **Unsubscribe Rate** - <2% monthly unsubscribe rate

## Risk Mitigation

### Technical Risks
- [ ] **Gmail API Limits** - Implement queue management and rate limiting
- [ ] **Database Performance** - Optimize queries and add indexes
- [ ] **Memory Usage** - Stream processing for large subscriber lists
- [ ] **Cron Failures** - Health checks and automatic restart mechanisms

### Business Risks
- [ ] **Spam Complaints** - Content guidelines and sender reputation monitoring
- [ ] **Subscriber Fatigue** - Frequency caps and preference management
- [ ] **Deliverability Issues** - Authentication (SPF, DKIM, DMARC) and monitoring

## Deployment Strategy

### Development Environment
- [ ] Local testing with limited subscriber lists
- [ ] Mock email service for development testing
- [ ] Staging environment with production-like data

### Production Rollout
- [ ] **Phase 1** - Soft launch with admin-only campaigns
- [ ] **Phase 2** - Limited beta with 10% of subscribers
- [ ] **Phase 3** - Full rollout with monitoring and gradual scaling
- [ ] **Rollback Plan** - Quick disable switches and campaign pause functionality

## Documentation Requirements

### Technical Documentation
- [ ] API documentation for campaign management
- [ ] Service architecture and integration guides
- [ ] Troubleshooting and maintenance procedures
- [ ] Performance tuning and scaling guidelines

### User Documentation  
- [ ] Admin guide for campaign creation
- [ ] Template design and customization guide
- [ ] Analytics and reporting interpretation
- [ ] Best practices for email marketing compliance

## Maintenance and Support

### Ongoing Maintenance
- [ ] **Weekly** - Campaign performance review and optimization
- [ ] **Monthly** - Subscriber list cleanup and segmentation analysis  
- [ ] **Quarterly** - Template effectiveness review and updates
- [ ] **Annually** - Compliance audit and security review

### Support Requirements
- [ ] Admin training for campaign management
- [ ] Subscriber support for email preferences
- [ ] Technical support for delivery issues
- [ ] Escalation procedures for critical failures

---

## Implementation Timeline

| Phase | Duration | Key Deliverables |
|-------|----------|------------------|
| **Phase 1** | 1-2 weeks | Core scheduling service, basic campaigns |
| **Phase 2** | 2-3 weeks | Admin interface, advanced scheduling |  
| **Phase 3** | 2-3 weeks | Automated workflows, lifecycle campaigns |
| **Phase 4** | 1-2 weeks | Analytics, optimization features |
| **Total** | **6-10 weeks** | Complete scheduled email system |

## Next Steps

1. **[ ] Review and approve plan** - Stakeholder sign-off on scope and timeline
2. **[ ] Set up development environment** - Configure test Gmail account and API access
3. **[ ] Create database migrations** - Design and implement new tables
4. **[ ] Begin Phase 1 development** - Start with EmailSchedulerService implementation
5. **[ ] Establish testing procedures** - Set up automated testing for email functionality

---

*This plan builds upon the existing email infrastructure and maintains consistency with the current MVC architecture and security practices of the Old Man Footy application.*
