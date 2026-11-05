# Book of the Month — Notification Center

A backend implementation of a notification center built with TypeScript, Koa, and MySQL.

The system supports three notification types: FILTER, CSV, and EVENT. It determines which accounts should receive notifications, creates deliveries, tracks clicks, and manages notification visibility and expiration.

## Tech Stack

- **TypeScript / Node.js** — Application logic
- **Koa** — HTTP API
- **MySQL** — Persistent storage
- **mysql2** — Database connection pooling and queries

## Getting Started

### Prerequisites

- Node.js and npm
- MySQL 8.x

### Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/jvasco/botm-notification-center.git
cd botm-notification-center
npm install
```

### Environment Variables

Create a `.env` file in the project root:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=notification_center
PORT=3000
```

Replace the values with your local MySQL configuration.

### Database Setup

Create the database:

```bash
mysql -u root -p -e "CREATE DATABASE notification_center;"
```

Import the schema:

```bash
mysql -u root -p notification_center < database/schema.sql
```

The schema defines five tables:

| Table | Purpose |
|---|---|
| `account` | Account attributes used for eligibility checks |
| `notification_definitions` | Notification configuration and metadata |
| `notification_definition_filters` | Eligibility rules for FILTER notifications |
| `notification_csv_recipients` | Explicit recipient lists for CSV campaigns |
| `notification_deliveries` | Individual deliveries, scheduling, and click tracking |

### Running the Application

```bash
npm run dev
```

The API runs at `http://localhost:3000` by default.

## Notification Types

### 1. FILTER Notifications

FILTER notifications dynamically determine recipients based on account attributes.

Supported filters include:

- Country
- Membership policy
- Relationship status
- Minimum credits
- Maximum credits

Filters of different types are combined using AND logic. Multiple values for the same categorical filter use OR logic.

For example, a campaign might target US members with a monthly policy, a FRIEND or BFF relationship status, and at least 10 credits.

Active FILTER definitions are evaluated against current account data. An account that becomes eligible after activation can receive the notification during a subsequent processing run.

**Monthly idempotency:** Each account can receive a given FILTER notification at most once per calendar month.

The idempotency key follows this format:

```text
{definitionId}:{accountId}:{YYYY-MM}
```

For example:

```text
1:2:2026-11
```

Repeated processing in the same month does not generate duplicate deliveries. An eligible account can receive the notification again in a new calendar month.

### 2. CSV Notifications

CSV notifications target an explicitly selected group of accounts rather than dynamically evaluating account attributes.

A typical use case is a marketing campaign targeting members selected through an external analytics process.

Recipients are represented in `notification_csv_recipients`.

Processing:

1. Retrieve pending recipients for an eligible CSV definition.
2. Lock the selected rows using `SELECT ... FOR UPDATE`.
3. Create notification deliveries.
4. Mark recipients as `PROCESSED`.
5. Commit the transaction.

Delivery creation and recipient status updates occur within the same database transaction. If processing fails, the transaction rolls back.

A unique constraint prevents an account from being added more than once to the same CSV definition.

CSV deliveries use an idempotency key containing the definition ID, account ID, and recipient row ID.

The schema also includes `scheduled_at` to support campaign scheduling.

### 3. EVENT Notifications

EVENT notifications are triggered by application events.

Supported event types:

- `SHIPPED`
- `ENROLLED`
- `AUDIOBOOK_AVAILABLE`

Each active EVENT definition can specify an optional `delay_days`.

**Immediate delivery:** If no delay is configured, the notification is delivered when the event is processed.

**Delayed delivery:** If a delay is configured, a delivery record is created with a future `scheduled_at` and a NULL `delivered_at`.

A separate processing operation makes due notifications visible by setting `delivered_at`.

Pending notifications do not appear in account notification retrieval.

## API Endpoints

### Process FILTER Notifications

```http
POST /notifications/process-filter-notifications
```

Evaluates active FILTER definitions and creates deliveries for eligible accounts.

```bash
curl -X POST \
  http://localhost:3000/notifications/process-filter-notifications
```

### Process CSV Notifications

```http
POST /notifications/process-csv-notifications
```

Processes pending recipients for eligible CSV definitions.

```bash
curl -X POST \
  http://localhost:3000/notifications/process-csv-notifications
```

### Trigger an EVENT

```http
POST /notifications/process-event
```

Example:

```bash
curl -X POST http://localhost:3000/notifications/process-event \
  -H "Content-Type: application/json" \
  -d '{"eventType":"SHIPPED","accountId":2}'
```

### Process Scheduled Notifications

```http
POST /notifications/process-scheduled-notifications
```

Delivers pending notifications whose scheduled time has passed.

```bash
curl -X POST \
  http://localhost:3000/notifications/process-scheduled-notifications
```

### Retrieve Account Notifications

```http
GET /notifications/get-account-notifications/:accountId
```

Example:

```bash
curl http://localhost:3000/notifications/get-account-notifications/2
```

Returns visible notifications ordered by delivery time, newest first.

Each notification includes its delivery ID, content, link, delivery timestamp, and click timestamp.

### Mark a Notification as Clicked

```http
PATCH /notifications/:notificationDeliveryId/click
```

Example:

```bash
curl -X PATCH http://localhost:3000/notifications/51/click
```

Records when a notification was clicked.

### Delete Expired Notifications

```http
POST /notifications/cleanup-expired
```

Example:

```bash
curl -X POST \
  http://localhost:3000/notifications/cleanup-expired
```

Deletes deliveries that have expired under the calendar-month retention policy.

## Notification Lifecycle

### Active vs. Removed

The system distinguishes between deactivating and removing a notification.

| Action | Existing deliveries | New deliveries |
|---|---|---|
| Set `is_active = 0` | Remain visible | Prevented |
| Set `removed_at` | Hidden from all accounts | Prevented |

A notification that becomes inactive remains visible to accounts that already received it.

Removing a notification hides it globally, including from accounts that previously received or clicked it.

The retrieval query therefore checks `removed_at` but does not require `is_active = 1`.

### Visibility and Retention

Notifications remain visible during the calendar month in which they were delivered and the following calendar month.

For example, a notification delivered on November 20 remains visible through December 31 and expires on January 1.

This is a calendar-based retention policy, not a rolling 60-day or two-month window.

Expired notifications are excluded from retrieval immediately, independently of physical database cleanup.

The cleanup operation deletes expired delivery records while preserving notification definitions.

## Data Integrity and Idempotency

The system uses several mechanisms to prevent duplicate or inconsistent deliveries:

- **FILTER:** Stable account/definition/month idempotency keys.
- **CSV:** Recipient status tracking, transactional processing, row locking, and unique constraints.
- **EVENT:** Immediate and delayed delivery paths, with scheduling state stored in the database.
- **Database:** Foreign keys and uniqueness constraints enforce key relationships.

The `notification_deliveries` table includes a unique constraint on:

```sql
UNIQUE (notification_definition_id, idempotency_key)
```

This allows retries to be handled safely when the same stable idempotency key is reused.

## Testing

The main notification workflows were manually tested using HTTP requests and direct MySQL queries.

Verified scenarios include:

| Scenario | Result |
|---|---|
| FILTER eligibility matching | Passed |
| Repeated FILTER processing within one month | Passed |
| CSV recipient processing | Passed |
| Repeated CSV processing | Passed |
| Delayed EVENT creation | Passed |
| Pending EVENT hidden from retrieval | Passed |
| Scheduled EVENT delivery after due time | Passed |
| Inactive notifications remain visible | Passed |
| Removed notifications disappear globally | Passed |
| Previous calendar-month visibility | Passed |
| Expired notification visibility and cleanup | Passed |
| CSV scheduling behavior | Passed locally |

## Design Decisions and Tradeoffs

This implementation prioritizes the core business rules, database consistency, and a straightforward architecture suitable for the take-home's time constraints.

### Explicit Processing Instead of Background Workers

FILTER evaluation, scheduled EVENT delivery, CSV processing, and retention cleanup are exposed through explicit API operations.

In production, these operations would typically be triggered by scheduled jobs or background workers rather than manually invoked HTTP requests.

Separating the processing logic from its trigger makes it possible to add that infrastructure without rewriting the core services.

### Database Transactions for CSV Processing

CSV recipient processing uses a transaction and row-level locking to prevent concurrent workers from processing the same pending recipients.

For substantially larger campaigns, batch processing would reduce transaction duration and database lock contention.

### Event Idempotency

EVENT notifications currently do not use a stable upstream event identifier for deduplication.

In production, an event ID or domain-specific identifier, such as an order ID, would allow repeated event deliveries to reuse the same idempotency key and avoid duplicate notifications.

### Retention Cleanup

Expired notifications are hidden by the retrieval query even before physical cleanup occurs.

The cleanup operation is currently manually triggered. A production deployment would schedule it periodically.

### Additional Production Considerations

Further production hardening would include:

- Authentication and authorization for account and administrative endpoints.
- Automated unit and integration tests.
- Background job scheduling and monitoring.
- Retry handling and dead-letter processing for failed jobs.
- Pagination for account notification retrieval.
- Batch processing for large recipient audiences.
- Stronger request validation and structured error handling.

## Additional Documentation

See `ARCHITECTURE.md` for architecture decisions and tradeoffs, and `DEVELOPMENT_LOG.md` for implementation progress and testing notes.