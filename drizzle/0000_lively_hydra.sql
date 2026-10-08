CREATE TABLE `allocations` (
	`id` text PRIMARY KEY NOT NULL,
	`payment_id` text NOT NULL,
	`installment_id` text NOT NULL,
	`owner` text NOT NULL,
	`amount` integer NOT NULL,
	FOREIGN KEY (`payment_id`) REFERENCES `records`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`installment_id`) REFERENCES `records`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_allocation_payment` ON `allocations` (`payment_id`);--> statement-breakpoint
CREATE INDEX `idx_allocation_installment` ON `allocations` (`installment_id`);--> statement-breakpoint
CREATE TABLE `company` (
	`owner` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`record_id` text NOT NULL,
	`action` text NOT NULL,
	`created_at` text NOT NULL,
	`detail` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_events_owner_date` ON `events` (`owner`,`created_at`);--> statement-breakpoint
CREATE TABLE `files` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`record_id` text NOT NULL,
	`filename` text NOT NULL,
	`content_type` text NOT NULL,
	`size` integer NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`record_id`) REFERENCES `records`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_files_owner_record` ON `files` (`owner`,`record_id`);--> statement-breakpoint
CREATE TABLE `records` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`kind` text NOT NULL,
	`data` text NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`demo` integer DEFAULT 0 NOT NULL,
	`archived` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_records_owner_kind` ON `records` (`owner`,`kind`);--> statement-breakpoint
CREATE TABLE `stock_balances` (
	`owner` text NOT NULL,
	`product_id` text NOT NULL,
	`warehouse` text NOT NULL,
	`quantity` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `records`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_stock_owner_product_warehouse` ON `stock_balances` (`owner`,`product_id`,`warehouse`);--> statement-breakpoint
CREATE TRIGGER guard_allocation BEFORE INSERT ON allocations BEGIN
 SELECT CASE WHEN NEW.amount <= 0 OR NOT EXISTS(SELECT 1 FROM records WHERE id=NEW.installment_id AND owner=NEW.owner AND kind='installments' AND archived=0) OR NOT EXISTS(SELECT 1 FROM records WHERE id=NEW.payment_id AND owner=NEW.owner AND kind='payments' AND json_extract(data,'$.status')='cleared' AND json_extract(data,'$.amount')=NEW.amount AND json_extract(data,'$.direction')='incoming' AND json_extract(data,'$.installmentId')=NEW.installment_id AND json_extract(data,'$.clientId')=(SELECT json_extract(data,'$.clientId') FROM records WHERE id=NEW.installment_id)) THEN RAISE(ABORT,'invalid_allocation') END;
 SELECT CASE WHEN (SELECT COALESCE(SUM(amount),0) FROM allocations WHERE installment_id=NEW.installment_id)+NEW.amount > (SELECT json_extract(data,'$.amount') FROM records WHERE id=NEW.installment_id) THEN RAISE(ABORT,'overpayment') END;
END;
--> statement-breakpoint
CREATE TRIGGER payment_insert AFTER INSERT ON records WHEN NEW.kind='payments' AND json_extract(NEW.data,'$.status')='cleared' AND json_extract(NEW.data,'$.installmentId') IS NOT NULL BEGIN
 INSERT INTO allocations(id,payment_id,installment_id,owner,amount) VALUES(NEW.id,NEW.id,json_extract(NEW.data,'$.installmentId'),NEW.owner,json_extract(NEW.data,'$.amount'));
END;
--> statement-breakpoint
CREATE TRIGGER payment_clear AFTER UPDATE ON records WHEN NEW.kind='payments' AND json_extract(OLD.data,'$.status')!='cleared' AND json_extract(NEW.data,'$.status')='cleared' AND json_extract(NEW.data,'$.installmentId') IS NOT NULL BEGIN
 INSERT INTO allocations(id,payment_id,installment_id,owner,amount) VALUES(NEW.id,NEW.id,json_extract(NEW.data,'$.installmentId'),NEW.owner,json_extract(NEW.data,'$.amount'));
END;
--> statement-breakpoint
CREATE TRIGGER payment_cancel AFTER UPDATE ON records WHEN NEW.kind='payments' AND json_extract(OLD.data,'$.status')='cleared' AND json_extract(NEW.data,'$.status')='cancelled' BEGIN
 DELETE FROM allocations WHERE payment_id=NEW.id;
END;
--> statement-breakpoint
CREATE TRIGGER guard_stock_update BEFORE UPDATE ON stock_balances WHEN NEW.quantity<0 BEGIN SELECT RAISE(ABORT,'insufficient_stock'); END;
--> statement-breakpoint
CREATE TRIGGER guard_stock_insert BEFORE INSERT ON stock_balances WHEN NEW.quantity<0 BEGIN SELECT RAISE(ABORT,'insufficient_stock'); END;
--> statement-breakpoint
CREATE TRIGGER stock_movement AFTER INSERT ON records WHEN NEW.kind='movements' BEGIN
 INSERT INTO stock_balances(owner,product_id,warehouse,quantity) VALUES(NEW.owner,json_extract(NEW.data,'$.productId'),json_extract(NEW.data,'$.warehouse'),0) ON CONFLICT DO NOTHING;
 UPDATE stock_balances SET quantity=quantity+CAST(ROUND(json_extract(NEW.data,'$.quantity')*1000) AS INTEGER) * CASE WHEN json_extract(NEW.data,'$.direction')='stockIn' THEN 1 ELSE -1 END WHERE owner=NEW.owner AND product_id=json_extract(NEW.data,'$.productId') AND warehouse=json_extract(NEW.data,'$.warehouse');
END;
--> statement-breakpoint
CREATE TRIGGER audit_insert AFTER INSERT ON records BEGIN INSERT INTO events(id,owner,record_id,action,created_at,detail) VALUES(lower(hex(randomblob(16))),NEW.owner,NEW.id,'create',NEW.updated_at,NEW.data); END;
--> statement-breakpoint
CREATE TRIGGER audit_update AFTER UPDATE ON records BEGIN INSERT INTO events(id,owner,record_id,action,created_at,detail) VALUES(lower(hex(randomblob(16))),NEW.owner,NEW.id,CASE WHEN NEW.archived=1 THEN 'archive' ELSE 'update' END,NEW.updated_at,json_object('before',json(OLD.data),'after',json(NEW.data))); END;
