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

