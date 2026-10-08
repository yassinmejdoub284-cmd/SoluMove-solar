CREATE UNIQUE INDEX uq_product_sku ON records(owner,json_extract(data,'$.sku')) WHERE kind='products' AND archived=0;
--> statement-breakpoint
CREATE UNIQUE INDEX uq_vehicle_registration ON records(owner,json_extract(data,'$.registration')) WHERE kind='vehicles' AND archived=0;
--> statement-breakpoint
CREATE UNIQUE INDEX uq_branch_code ON records(owner,json_extract(data,'$.code')) WHERE kind='agencies' AND archived=0;
--> statement-breakpoint
CREATE UNIQUE INDEX uq_warehouse_code ON records(owner,json_extract(data,'$.code')) WHERE kind='warehouses' AND archived=0;
--> statement-breakpoint
CREATE UNIQUE INDEX uq_payslip_period ON records(owner,json_extract(data,'$.employeeId'),json_extract(data,'$.period')) WHERE kind='payroll' AND archived=0;
--> statement-breakpoint
CREATE UNIQUE INDEX uq_effect_number ON records(owner,json_extract(data,'$.number'),COALESCE(json_extract(data,'$.bank'),''),COALESCE(json_extract(data,'$.account'),'')) WHERE kind='effects' AND archived=0;
--> statement-breakpoint
CREATE TRIGGER guard_mission_insert BEFORE INSERT ON records WHEN NEW.kind='missions' AND json_extract(NEW.data,'$.status') IN ('planned','confirmed') BEGIN
 SELECT CASE WHEN EXISTS(SELECT 1 FROM records WHERE kind='missions' AND archived=0 AND owner=NEW.owner AND json_extract(data,'$.vehicleId')=json_extract(NEW.data,'$.vehicleId') AND json_extract(data,'$.date')=json_extract(NEW.data,'$.date') AND json_extract(data,'$.status') IN ('planned','confirmed') AND json_extract(data,'$.time') < json_extract(NEW.data,'$.returnTime') AND json_extract(data,'$.returnTime') > json_extract(NEW.data,'$.time')) THEN RAISE(ABORT,'vehicle_overlap') END;
END;
--> statement-breakpoint
CREATE TRIGGER guard_mission_update BEFORE UPDATE ON records WHEN NEW.kind='missions' AND json_extract(NEW.data,'$.status') IN ('planned','confirmed') BEGIN
 SELECT CASE WHEN EXISTS(SELECT 1 FROM records WHERE kind='missions' AND archived=0 AND owner=NEW.owner AND id!=NEW.id AND json_extract(data,'$.vehicleId')=json_extract(NEW.data,'$.vehicleId') AND json_extract(data,'$.date')=json_extract(NEW.data,'$.date') AND json_extract(data,'$.status') IN ('planned','confirmed') AND json_extract(data,'$.time') < json_extract(NEW.data,'$.returnTime') AND json_extract(data,'$.returnTime') > json_extract(NEW.data,'$.time')) THEN RAISE(ABORT,'vehicle_overlap') END;
END;
--> statement-breakpoint
CREATE TRIGGER mission_km_insert AFTER INSERT ON records WHEN NEW.kind='missions' AND json_extract(NEW.data,'$.status')='completed' AND json_extract(NEW.data,'$.endKm') IS NOT NULL BEGIN
 UPDATE records SET data=json_set(data,'$.odometer',MAX(COALESCE(json_extract(data,'$.odometer'),0),json_extract(NEW.data,'$.endKm'))),revision=revision+1,updated_at=NEW.updated_at WHERE id=json_extract(NEW.data,'$.vehicleId') AND owner=NEW.owner AND kind='vehicles';
END;
--> statement-breakpoint
CREATE TRIGGER mission_km_update AFTER UPDATE ON records WHEN NEW.kind='missions' AND json_extract(OLD.data,'$.status')!='completed' AND json_extract(NEW.data,'$.status')='completed' AND json_extract(NEW.data,'$.endKm') IS NOT NULL BEGIN
 UPDATE records SET data=json_set(data,'$.odometer',MAX(COALESCE(json_extract(data,'$.odometer'),0),json_extract(NEW.data,'$.endKm'))),revision=revision+1,updated_at=NEW.updated_at WHERE id=json_extract(NEW.data,'$.vehicleId') AND owner=NEW.owner AND kind='vehicles';
END;
