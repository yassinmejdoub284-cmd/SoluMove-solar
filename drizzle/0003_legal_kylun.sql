CREATE TABLE `serial_locations` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`serial` text NOT NULL,
	`product_id` text NOT NULL,
	`warehouse` text,
	`project_id` text,
	`last_movement` text NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `records`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_serial_owner_serial` ON `serial_locations` (`owner`,`serial`);--> statement-breakpoint
CREATE TRIGGER serial_in_guard BEFORE INSERT ON records WHEN NEW.kind='movements' AND json_extract(NEW.data,'$.direction')='stockIn' BEGIN
 SELECT CASE WHEN EXISTS(SELECT 1 FROM json_each(NEW.data,'$.serialList') AS item JOIN serial_locations AS serial ON serial.owner=NEW.owner AND serial.serial=item.value WHERE serial.warehouse IS NOT NULL OR serial.product_id!=json_extract(NEW.data,'$.productId')) THEN RAISE(ABORT,'serial_location') END;
END;
--> statement-breakpoint
CREATE TRIGGER serial_out_guard BEFORE INSERT ON records WHEN NEW.kind='movements' AND json_extract(NEW.data,'$.direction')='stockOut' BEGIN
 SELECT CASE WHEN EXISTS(SELECT 1 FROM json_each(NEW.data,'$.serialList') AS item WHERE NOT EXISTS(SELECT 1 FROM serial_locations AS serial WHERE serial.owner=NEW.owner AND serial.serial=item.value AND serial.warehouse=json_extract(NEW.data,'$.warehouse') AND serial.product_id=json_extract(NEW.data,'$.productId'))) THEN RAISE(ABORT,'serial_location') END;
END;
--> statement-breakpoint
CREATE TRIGGER serial_in AFTER INSERT ON records WHEN NEW.kind='movements' AND json_extract(NEW.data,'$.direction')='stockIn' BEGIN
 INSERT INTO serial_locations(id,owner,serial,product_id,warehouse,project_id,last_movement) SELECT lower(hex(randomblob(16))),NEW.owner,value,json_extract(NEW.data,'$.productId'),json_extract(NEW.data,'$.warehouse'),NULL,NEW.id FROM json_each(NEW.data,'$.serialList') WHERE true ON CONFLICT(owner,serial) DO UPDATE SET warehouse=excluded.warehouse,project_id=NULL,last_movement=excluded.last_movement;
END;
--> statement-breakpoint
CREATE TRIGGER serial_out AFTER INSERT ON records WHEN NEW.kind='movements' AND json_extract(NEW.data,'$.direction')='stockOut' BEGIN
 UPDATE serial_locations SET warehouse=NULL,project_id=json_extract(NEW.data,'$.projectId'),last_movement=NEW.id WHERE owner=NEW.owner AND serial IN (SELECT value FROM json_each(NEW.data,'$.serialList'));
END;
