PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_employees` (
	`id` text PRIMARY KEY NOT NULL,
	`employee_number` text NOT NULL,
	`full_name` text NOT NULL,
	`email` text NOT NULL,
	`phone_number` text NOT NULL,
	`department` text,
	`role` text,
	`preferred_language` text DEFAULT 'en-US' NOT NULL,
	`company_id` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_employees`("id", "employee_number", "full_name", "email", "phone_number", "department", "role", "preferred_language", "company_id", "created_at", "updated_at", "deleted_at") SELECT "id", "employee_number", "full_name", "email", "phone_number", "department", "role", "preferred_language", "company_id", "created_at", "updated_at", "deleted_at" FROM `employees`;--> statement-breakpoint
DROP TABLE `employees`;--> statement-breakpoint
ALTER TABLE `__new_employees` RENAME TO `employees`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `employees_email_unique` ON `employees` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `company_employee_num_idx` ON `employees` (`company_id`,`employee_number`);