# Development Log
Will use this file to keep track of progress on the project

## Session 1 — Project Initialization and Understanding the Requirements

### Goals
- Understand the BOTM Notification Center requirements
- Set up the Node.js and TypeScript project
- Establish the Koa application structure
- Initialize the GitHub repository

### Work Completed
- Created the botm-notification-center project and repository
- Initialized the Node.js project and installed dependencies
- Created the initial Koa application
- Created initial health-checkpoint
- Began breaking down the notification requirements

### AI Tooling
- Used AI to accelerate initial project setup and generate boilerplate configuration and application code
- Reviewed and adapted generated code to fit the intended application structure

## Session 2 - Creating the Database Schema and Implementing Filter Notification Processing

### Goals
- Create the separate entities needed for the project
- Understand which entities can simply be referenced and don't need to be created, and which are required for MVP for project
- Understand relationships between tables/entities
- Create the schema and fill in tables with test data
- Begin implementing the notification processing workflow

### Work Completed
- Created the MySQL DB schema
- Added mock data to test relationships, constraints, etc
- Implemented FILTER notification recipient selection based on account attributes and notification filters
- Added endpoints to process FILTER notifications and get delivered notifications for users
- Created a service to persist notification deliveries in DB

### AI/Additional Tooling
- Used drawsql.app to map out and create the initial DB schema, then passed it through ChatGPT to confirm structure against requirements
- Used ChatGPT to create mock data for tables

## Session 3 - CSV and Event Notification Processing

### Goals
- Implement CSV notification processing
- Implement event-triggered notifications
- Test notification delivery end to end

### Work Completed
- Implemented CSV recipient processing using the notification_csv_recipients table
- Added transactional CSV processing to create deliveries and update recipient statuses atomically
- Used SELECT ... FOR UPDATE to lock pending recipients during processing
- Added a CSV processing API endpoint
- Added an endpoint to trigger event processing using an event type (SHIPPED, ENROLLED, and AUDIOBOOK_AVAILABLE) and account ID
- Successfully tested imediate EVENT notification processing through the API

## Session 4 - Implement Delays for Event Notification Processing

### Goals
- Support delayed delivery for EVENT notifications using delay_days
- Test scheduling and delivery ent to end

### Work Completed
- Added a nullable scheduled_at column to notification_deliveries
- Updated delivered_at to allow NULL for notifications that have not yet been delivered
- Modified EVENT processing to support both immediate and delayed notifications based on delay_days 
- Implemented processScheduledNotifications() to deliver pending notifications once their scheduled time has arrived
- Added a POST endpoint to manually trigger scheduled notification processing
- Tested delayed notification creation, scheduled processing, and notification visibility through the account notifications endpoint
- Verified that rerunning scheduled processing does not redeliver already-delivered notifications

## Session 5 - FILTER Idempotency, Continuous Eligibility, and Notification Visibility

### Goals
- Implement the requirement that active FILTER notifications can be delivered once per calendar month.
- Prevent duplicate deliveries when FILTER processing runs multiple times.
- Determine how to support accounts becoming eligible after notification activation. 
- Address two static calendar month requirement

### Work Completed
- Updated createNotificationDeliveries() to accept an optional idempotency key generator
- Implemented monthly idempotency keys for FILTER notifications using the notification definition ID, account ID, and calendar month
- Added handling for MySQL duplicate-key errors to skip existing deliveries without failing the entire processing run
- Updated the default delivery key generation to use UUIDs rather than minute-based timestamps.
- Updated notification retrieval to use calendar-month boundaries instead of a rolling one-month window
- Added a cleanup function to delete expired notification deliveries

## 6 - Notification Processing Verification and Retention

### Goals
- Test all MVP flows and compare results to original requirements
- Look over specs doc and confirm we address all requirements

### Work Completed
- FILTER: Verified that eligible accounts receive notifications and repeated processing within the same calendar month does not create duplicates.
- EVENT: Verified that delayed notifications are created with a future scheduled_at and NULL delivered_at, remain hidden until due, and become visible after scheduled processing.
- CSV: Verified that recipients are marked PROCESSED, deliveries are created, and repeated processing does not generate duplicates.
- Remove from app: Updated notification retrieval to exclude definitions with removed_at IS NOT NULL. Verified that removed notifications disappear for existing recipients.
- Inactive: Verified that deactivating a definition does not hide previously delivered notifications.
- Implemented visibility filtering using calendar-month boundaries rather than a rolling two-month interval.
- Verified that notifications from the previous calendar month remain visible, older notifications are hidden, and cleanup removes expired delivery rows.
