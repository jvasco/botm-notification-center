# Architecture and Design Choices
Will use this file to explain how the system is designed and why. This will elaborate on tradeoffs, assumptions, and decisions made throughout the development process.
## Project Overview:
The Book of the Month notification center is a backend service responsible for managing notification definitions, determining which specific members should receive notifications, and tracking notifications delivered to indicidual members.

This service supports three types of notification mechanisms:

1. Filter-based: Notifications targetted at members based on a user account attributes, including country (US or CA), membership policy (monthly, annual), relationship status (new member, friend, or BFF), and available credits

2. CSV upload: One-time notifications sent to a specified list of user account IDs

### DB Design Choices and Tradeoffs

![DB Schema](image.png)

- Create separate tables for notification definitions and notification deliveries. Notification definitions define the fields and values that are sent/displayed for a user. This acts as the notification campaign. The deliveries table contains the information for the specific delivery for the specific user, referencing the deliveries table

- Idempotency key. For the purpose of this project I designed the idempotency key for notification_deliveries to be the `${notificationDefinitionId}:${accountId}:${minute}`. This restricts the same notification definition to be sent to a user within the same minute. This current implementation allows for a user to receive the same notification in the same day (e.g. two shipments in the same day) but not in the same minute. Ideally in production, this key would be built using a specific attribute from the notification source, for example order ID or event ID.

- I've built a basic assumption on what the accounts table could possibly look like.

- Multiple rows per notification_definition for different filters vs one row containing all filters. I chose to have multiple rows per definition instead of storing all filters in one single row for each definition. This is a trade off (space vs cleanliness) but in my opinion this approach is much more readable and prevents the possibility of bad data in our filters

### Delayed EVENT Notification Scheduling
EVENT notifications may require a delay between the triggering event and when the notification becomes visible to an account. An example might be: we want to send the user a notification 3 days after they sign up.

Decided to reuse the existing notfication_deliveries table by adding a nullable scheduled_at column. Delayed notifications are inserted with a future scheduled_at timestamp and delivered_at = NULL.

A separate processing function identifies notifications whose scheudled time has arrive and sets their delivered_at timestamp and makes appropriate updates.

Rationale:
- Changing the notification_deliveries table allows us to avoid introducing an additional scheduling table

Tradeoffs:
- Scheduled notifications require a separate process to run periodically (exposed via API endpoint). Ideally in a production scenario we introduce a scheduled job to check for notifications ready to be delivered.
- Delivery may occur later than scheduled_at if processing is delayed

### Monthly FILTER Notification Idempotency
Active FILTER notifications must be delivered to eligible accounts at most once per calendar month. Accounts may become eligible at any point while a notification is active. Decided to generate idempotency keys for FILTER deliveries using the notification definition ID, account ID, and calendar month

Tradeoffs:
- FILTER processing must run repeatedly to identify newly eligible accounts. Ideally in a production environment we would introduce a Change Data Capture or a scheduler that runs frequently (e.g. every 30 seconds) to repeatedly determine newly eligible accounts
 - Default UUID-based delivery keys do not provide reliable EVENT retry idempotency. EVENT processing would need stable identifiers for triggering events

 ### Calendar-Month Notification Retention
 The specification requires notifications to remain visible for two static months rather than a rolling two-month period.
 Decided to treat the delivery month and the following calendar month as the visibility window. For example, notifications delivered in November remain visible through December 31 and expire on January 1.

Use the first day of the previous calendar month as the cutoff when retrieving notifications:

del.delivered_at >= DATE_FORMAT(
    CURRENT_DATE - INTERVAL 1 MONTH,
    '%Y-%m-01'
)

Expired notification deliveries are permanently removed through a separate cleanup operation

Tradeoffs
- Made the decision to delete the expired notifications via a separate process. If I had more time I would consider marking these notifications as EXPIRED and wouldn't allow the system to surface them for users. In a production environment, it could be important to maintain older expired notifications for logging or other historical purposes

- The cleanup job has to be triggered manually. Ideally this is also something that is run semi-regularly (once a day).



### Possible Failure Scenarios
- I identified a failure scenario where CSV deliveries could be created without recipients being marked as process. Originally I had one DB transaction where I was adding a delivery to notification_deliveries and then a separate transaction to mark the recipient as processed in notification_csv_recipients. I changed this to do both transactions atomically and avoid this edge case where one transaction succeeds and the other fails