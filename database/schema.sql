CREATE TABLE `notification_definitions`(
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(255) NOT NULL,
    `type` ENUM('FILTER', 'CSV', 'EVENT') NOT NULL COMMENT 'FILTER, CSV, or EVENT',
    `icon` VARCHAR(255) NOT NULL,
    `headline` VARCHAR(255) NOT NULL,
    `subheadline` VARCHAR(255) NOT NULL,
    `link` VARCHAR(255) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT 1 COMMENT 'Editable only for FILTER and EVENT notifications',
    `removed_at` DATETIME NULL,
    `delay_days` INT NULL COMMENT 'For event triggered notifications ONLY',
    `event_type` ENUM(
        'SHIPPED',
        'ENROLLED',
        'AUDIOBOOK_AVAILABLE'
    ) NULL COMMENT 'SHIPPED, ENROLLED, AUDIOBOOK_AVAILABLE',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `scheduled_at` DATETIME NULL COMMENT 'For scheduling CSV notifications only',
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_definitions_type_active` (`type`, `is_active`)
);
CREATE TABLE `account`(
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `country` ENUM('US', 'CA') NOT NULL COMMENT 'US or CA',
    `policy` ENUM('MONTHLY', 'ANNUAL') NOT NULL,
    `relationship_status` ENUM('NEW_MEMBER', 'FRIEND', 'BFF') NOT NULL,
    `credits` INT NOT NULL
);
CREATE TABLE `notification_deliveries`(
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `notification_definition_id` BIGINT UNSIGNED NOT NULL COMMENT 'foreign key to notification_definition',
    `account_id` BIGINT UNSIGNED NOT NULL COMMENT 'FK to account table',
    `delivered_at` DATETIME NULL,
    `clicked_at` DATETIME NULL,
    `scheduled_at` DATETIME NULL,
    `idempotency_key` VARCHAR(255) NOT NULL,
    UNIQUE (`notification_definition_id`, `idempotency_key`),
    INDEX idx_deliveries_account_delivered (`account_id`, `delivered_at`)
);
CREATE TABLE `notification_definition_filters`(
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `notification_definition_id` BIGINT UNSIGNED NOT NULL,
    `filter_type` ENUM(
        'POLICY',
        'RELATIONSHIP_STATUS',
        'MIN_CREDITS',
        'MAX_CREDITS',
        'COUNTRY'
    ) NOT NULL,
    `filter_value` VARCHAR(255) NOT NULL,
    UNIQUE (`notification_definition_id`, `filter_type`, `filter_value`)
);
CREATE TABLE `notification_csv_recipients`(
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `notification_definition_id` BIGINT UNSIGNED NOT NULL,
    `account_id` BIGINT UNSIGNED NOT NULL,
    `status` ENUM('PENDING', 'PROCESSED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `processed_at` DATETIME NULL,
    UNIQUE (`notification_definition_id`, `account_id`),
    INDEX idx_csv_recipients_status ( `notification_definition_id`, `status` )
);
ALTER TABLE
    `notification_definition_filters` ADD CONSTRAINT `notification_definition_filters_notification_def_fk` FOREIGN KEY(`notification_definition_id`) REFERENCES `notification_definitions`(`id`);
ALTER TABLE
    `notification_csv_recipients` ADD CONSTRAINT `notification_csv_recipients_account_id_foreign` FOREIGN KEY(`account_id`) REFERENCES `account`(`id`);
ALTER TABLE
    `notification_deliveries` ADD CONSTRAINT `notification_deliveries_notification_definition_id_foreign` FOREIGN KEY(`notification_definition_id`) REFERENCES `notification_definitions`(`id`);
ALTER TABLE
    `notification_csv_recipients` ADD CONSTRAINT `notification_csv_recipients_notification_definition_id_foreign` FOREIGN KEY(`notification_definition_id`) REFERENCES `notification_definitions`(`id`);
ALTER TABLE 
    `notification_deliveries` ADD CONSTRAINT `fk_delivery_account` FOREIGN KEY (`account_id`) REFERENCES `account`(`id`);