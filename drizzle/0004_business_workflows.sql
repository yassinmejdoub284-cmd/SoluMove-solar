CREATE TABLE operation_guards (id TEXT PRIMARY KEY NOT NULL, owner TEXT NOT NULL, record_id TEXT NOT NULL, revision INTEGER NOT NULL);
--> statement-breakpoint
CREATE TRIGGER operation_guard BEFORE INSERT ON operation_guards BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM records WHERE id=NEW.record_id AND owner=NEW.owner AND revision=NEW.revision AND archived=0) THEN RAISE(ABORT,'conflict') END;
END;
--> statement-breakpoint
DROP INDEX uq_allocation_payment;
--> statement-breakpoint
CREATE UNIQUE INDEX uq_allocation_payment_installment ON allocations(payment_id,installment_id);
--> statement-breakpoint
DROP TRIGGER guard_allocation;
--> statement-breakpoint
CREATE TRIGGER guard_allocation BEFORE INSERT ON allocations BEGIN
 SELECT CASE WHEN NEW.amount<=0 OR typeof(NEW.amount)!='integer' OR NOT EXISTS(SELECT 1 FROM records WHERE id=NEW.installment_id AND owner=NEW.owner AND kind='installments' AND archived=0) OR NOT EXISTS(SELECT 1 FROM records p JOIN records i ON i.id=NEW.installment_id WHERE p.id=NEW.payment_id AND p.owner=NEW.owner AND p.kind='payments' AND json_extract(p.data,'$.status')='cleared' AND json_extract(p.data,'$.direction')='incoming' AND json_extract(p.data,'$.clientId')=json_extract(i.data,'$.clientId')) THEN RAISE(ABORT,'invalid_allocation') END;
 SELECT CASE WHEN COALESCE((SELECT SUM(amount) FROM allocations WHERE payment_id=NEW.payment_id),0)+NEW.amount>(SELECT json_extract(data,'$.amount') FROM records WHERE id=NEW.payment_id) THEN RAISE(ABORT,'invalid_allocation') END;
 SELECT CASE WHEN COALESCE((SELECT SUM(amount) FROM allocations WHERE installment_id=NEW.installment_id),0)+NEW.amount>(SELECT json_extract(data,'$.amount') FROM records WHERE id=NEW.installment_id) THEN RAISE(ABORT,'overpayment') END;
END;
--> statement-breakpoint
CREATE TRIGGER payment_multi_insert AFTER INSERT ON records WHEN NEW.kind='payments' AND json_extract(NEW.data,'$.status')='cleared' AND json_array_length(NEW.data,'$.allocations')>0 BEGIN
 INSERT INTO allocations(id,payment_id,installment_id,owner,amount) SELECT NEW.id||'-'||key,NEW.id,json_extract(value,'$.installmentId'),NEW.owner,json_extract(value,'$.amount') FROM json_each(NEW.data,'$.allocations');
END;
--> statement-breakpoint
CREATE TRIGGER payment_multi_clear AFTER UPDATE ON records WHEN NEW.kind='payments' AND json_extract(OLD.data,'$.status')!='cleared' AND json_extract(NEW.data,'$.status')='cleared' AND json_array_length(NEW.data,'$.allocations')>0 BEGIN
 INSERT INTO allocations(id,payment_id,installment_id,owner,amount) SELECT NEW.id||'-'||key,NEW.id,json_extract(value,'$.installmentId'),NEW.owner,json_extract(value,'$.amount') FROM json_each(NEW.data,'$.allocations');
END;
--> statement-breakpoint
CREATE UNIQUE INDEX uq_account_code ON records(owner,json_extract(data,'$.code')) WHERE kind='accounts' AND archived=0;
--> statement-breakpoint
CREATE UNIQUE INDEX uq_journal_code ON records(owner,json_extract(data,'$.code')) WHERE kind='journals' AND archived=0;
--> statement-breakpoint
CREATE UNIQUE INDEX uq_user_email ON records(owner,lower(json_extract(data,'$.email'))) WHERE kind='users' AND archived=0;
--> statement-breakpoint
CREATE INDEX idx_staff_email ON records(lower(json_extract(data,'$.email')),kind) WHERE kind='users' AND archived=0;
--> statement-breakpoint
CREATE TRIGGER journal_insert_guard BEFORE INSERT ON records WHEN NEW.kind='journalEntries' AND json_extract(NEW.data,'$.status')='posted' BEGIN
 SELECT CASE WHEN EXISTS(SELECT 1 FROM records WHERE owner=NEW.owner AND kind='fiscalPeriods' AND archived=0 AND json_extract(data,'$.status')='closed' AND json_extract(NEW.data,'$.date') BETWEEN json_extract(data,'$.startDate') AND json_extract(data,'$.endDate')) THEN RAISE(ABORT,'period_closed') END;
 SELECT CASE WHEN COALESCE((SELECT SUM(COALESCE(json_extract(value,'$.debit'),0))-SUM(COALESCE(json_extract(value,'$.credit'),0)) FROM json_each(NEW.data,'$.rows')),1)!=0 THEN RAISE(ABORT,'unbalanced_entry') END;
 SELECT CASE WHEN json_array_length(NEW.data,'$.rows')<2 OR EXISTS(SELECT 1 FROM json_each(NEW.data,'$.rows') r WHERE COALESCE(json_extract(r.value,'$.debit'),0)<0 OR COALESCE(json_extract(r.value,'$.credit'),0)<0 OR (COALESCE(json_extract(r.value,'$.debit'),0)=0 AND COALESCE(json_extract(r.value,'$.credit'),0)=0) OR (COALESCE(json_extract(r.value,'$.debit'),0)>0 AND COALESCE(json_extract(r.value,'$.credit'),0)>0) OR NOT EXISTS(SELECT 1 FROM records a WHERE a.owner=NEW.owner AND a.id=json_extract(r.value,'$.accountId') AND a.kind='accounts' AND archived=0 AND json_extract(a.data,'$.status')='active')) THEN RAISE(ABORT,'invalid_journal_line') END;
END;
--> statement-breakpoint
CREATE TRIGGER journal_update_guard BEFORE UPDATE ON records WHEN NEW.kind='journalEntries' BEGIN
 SELECT CASE WHEN json_extract(NEW.data,'$.status')='posted' AND (json_array_length(NEW.data,'$.rows')<2 OR EXISTS(SELECT 1 FROM json_each(NEW.data,'$.rows') r WHERE COALESCE(json_extract(r.value,'$.debit'),0)<0 OR COALESCE(json_extract(r.value,'$.credit'),0)<0 OR (COALESCE(json_extract(r.value,'$.debit'),0)=0 AND COALESCE(json_extract(r.value,'$.credit'),0)=0) OR (COALESCE(json_extract(r.value,'$.debit'),0)>0 AND COALESCE(json_extract(r.value,'$.credit'),0)>0) OR NOT EXISTS(SELECT 1 FROM records a WHERE a.owner=NEW.owner AND a.id=json_extract(r.value,'$.accountId') AND a.kind='accounts' AND archived=0 AND json_extract(a.data,'$.status')='active')) ) THEN RAISE(ABORT,'invalid_journal_line') END;
 SELECT CASE WHEN json_extract(OLD.data,'$.status')='posted' THEN RAISE(ABORT,'immutable') END;
 SELECT CASE WHEN json_extract(NEW.data,'$.status')='posted' AND EXISTS(SELECT 1 FROM records WHERE owner=NEW.owner AND kind='fiscalPeriods' AND archived=0 AND json_extract(data,'$.status')='closed' AND json_extract(NEW.data,'$.date') BETWEEN json_extract(data,'$.startDate') AND json_extract(data,'$.endDate')) THEN RAISE(ABORT,'period_closed') END;
 SELECT CASE WHEN json_extract(NEW.data,'$.status')='posted' AND COALESCE((SELECT SUM(COALESCE(json_extract(value,'$.debit'),0))-SUM(COALESCE(json_extract(value,'$.credit'),0)) FROM json_each(NEW.data,'$.rows')),1)!=0 THEN RAISE(ABORT,'unbalanced_entry') END;
END;
--> statement-breakpoint
CREATE TRIGGER leave_insert_guard BEFORE INSERT ON records WHEN NEW.kind='leave' AND json_extract(NEW.data,'$.status')='approved' BEGIN
 SELECT CASE WHEN EXISTS(SELECT 1 FROM records WHERE owner=NEW.owner AND kind='leave' AND archived=0 AND json_extract(data,'$.status')='approved' AND json_extract(data,'$.employeeId')=json_extract(NEW.data,'$.employeeId') AND json_extract(data,'$.startDate')<=json_extract(NEW.data,'$.endDate') AND json_extract(data,'$.endDate')>=json_extract(NEW.data,'$.startDate')) THEN RAISE(ABORT,'leave_overlap') END;
 SELECT CASE WHEN json_extract(NEW.data,'$.type')='paidLeave' AND COALESCE((SELECT SUM(json_extract(data,'$.days')) FROM records WHERE owner=NEW.owner AND kind='leave' AND archived=0 AND json_extract(data,'$.status')='approved' AND json_extract(data,'$.type')='paidLeave' AND json_extract(data,'$.employeeId')=json_extract(NEW.data,'$.employeeId') AND substr(json_extract(data,'$.startDate'),1,4)=substr(json_extract(NEW.data,'$.startDate'),1,4)),0)+json_extract(NEW.data,'$.days')>json_extract(NEW.data,'$.annualLeaveLimit') THEN RAISE(ABORT,'insufficient_leave') END;
END;
--> statement-breakpoint
CREATE TRIGGER leave_update_guard BEFORE UPDATE ON records WHEN NEW.kind='leave' AND json_extract(NEW.data,'$.status')='approved' AND NEW.archived=0 BEGIN
 SELECT CASE WHEN EXISTS(SELECT 1 FROM records WHERE owner=NEW.owner AND kind='leave' AND archived=0 AND id!=NEW.id AND json_extract(data,'$.status')='approved' AND json_extract(data,'$.employeeId')=json_extract(NEW.data,'$.employeeId') AND json_extract(data,'$.startDate')<=json_extract(NEW.data,'$.endDate') AND json_extract(data,'$.endDate')>=json_extract(NEW.data,'$.startDate')) THEN RAISE(ABORT,'leave_overlap') END;
 SELECT CASE WHEN json_extract(NEW.data,'$.type')='paidLeave' AND COALESCE((SELECT SUM(json_extract(data,'$.days')) FROM records WHERE owner=NEW.owner AND kind='leave' AND archived=0 AND id!=NEW.id AND json_extract(data,'$.status')='approved' AND json_extract(data,'$.type')='paidLeave' AND json_extract(data,'$.employeeId')=json_extract(NEW.data,'$.employeeId') AND substr(json_extract(data,'$.startDate'),1,4)=substr(json_extract(NEW.data,'$.startDate'),1,4)),0)+json_extract(NEW.data,'$.days')>json_extract(NEW.data,'$.annualLeaveLimit') THEN RAISE(ABORT,'insufficient_leave') END;
END;

--> statement-breakpoint
CREATE TABLE stock_guards (id TEXT PRIMARY KEY NOT NULL,owner TEXT NOT NULL,product_id TEXT NOT NULL,warehouse TEXT NOT NULL,quantity INTEGER NOT NULL);
--> statement-breakpoint
CREATE TRIGGER stock_count_guard BEFORE INSERT ON stock_guards BEGIN
 SELECT CASE WHEN COALESCE((SELECT quantity FROM stock_balances WHERE owner=NEW.owner AND product_id=NEW.product_id AND warehouse=NEW.warehouse),0)!=NEW.quantity THEN RAISE(ABORT,'conflict') END;
END;

--> statement-breakpoint
CREATE TRIGGER fiscalperiods_insert_overlap BEFORE INSERT ON records WHEN NEW.kind='fiscalPeriods' AND NEW.archived=0 BEGIN
 SELECT CASE WHEN EXISTS(SELECT 1 FROM records WHERE owner=NEW.owner AND kind=NEW.kind AND id!=NEW.id AND archived=0 AND json_extract(data,'$.startDate')<=json_extract(NEW.data,'$.endDate') AND json_extract(data,'$.endDate')>=json_extract(NEW.data,'$.startDate')) THEN RAISE(ABORT,'period_overlap') END;
END;

--> statement-breakpoint
CREATE TRIGGER fiscalperiods_update_overlap BEFORE UPDATE ON records WHEN NEW.kind='fiscalPeriods' AND NEW.archived=0 BEGIN
 SELECT CASE WHEN EXISTS(SELECT 1 FROM records WHERE owner=NEW.owner AND kind=NEW.kind AND id!=NEW.id AND archived=0 AND json_extract(data,'$.startDate')<=json_extract(NEW.data,'$.endDate') AND json_extract(data,'$.endDate')>=json_extract(NEW.data,'$.startDate')) THEN RAISE(ABORT,'period_overlap') END;
END;

--> statement-breakpoint
CREATE TRIGGER payrollpolicies_insert_overlap BEFORE INSERT ON records WHEN NEW.kind='payrollPolicies' AND NEW.archived=0 AND json_extract(NEW.data,'$.status')='validated' BEGIN
 SELECT CASE WHEN EXISTS(SELECT 1 FROM records WHERE owner=NEW.owner AND kind=NEW.kind AND id!=NEW.id AND archived=0 AND json_extract(data,'$.status')='validated' AND json_extract(data,'$.startDate')<=json_extract(NEW.data,'$.endDate') AND json_extract(data,'$.endDate')>=json_extract(NEW.data,'$.startDate')) THEN RAISE(ABORT,'policy_overlap') END;
END;

--> statement-breakpoint
CREATE TRIGGER payrollpolicies_update_overlap BEFORE UPDATE ON records WHEN NEW.kind='payrollPolicies' AND NEW.archived=0 AND json_extract(NEW.data,'$.status')='validated' BEGIN
 SELECT CASE WHEN EXISTS(SELECT 1 FROM records WHERE owner=NEW.owner AND kind=NEW.kind AND id!=NEW.id AND archived=0 AND json_extract(data,'$.status')='validated' AND json_extract(data,'$.startDate')<=json_extract(NEW.data,'$.endDate') AND json_extract(data,'$.endDate')>=json_extract(NEW.data,'$.startDate')) THEN RAISE(ABORT,'policy_overlap') END;
END;

--> statement-breakpoint
CREATE TRIGGER restructure_conservation BEFORE UPDATE ON records WHEN NEW.kind='installments' BEGIN
 SELECT CASE WHEN json_extract(NEW.data,'$.amount')<COALESCE((SELECT SUM(amount) FROM allocations WHERE installment_id=NEW.id AND owner=NEW.owner),0) OR (json_extract(NEW.data,'$.status')='restructured' AND json_extract(NEW.data,'$.amount')!=COALESCE((SELECT SUM(amount) FROM allocations WHERE installment_id=NEW.id AND owner=NEW.owner),0)) THEN RAISE(ABORT,'conflict') END;
END;
--> statement-breakpoint
CREATE TRIGGER reopen_due_before_cancellation BEFORE UPDATE ON records WHEN NEW.kind='payments' AND json_extract(OLD.data,'$.status')='cleared' AND json_extract(NEW.data,'$.status')!='cleared' BEGIN
 UPDATE records SET data=json_set(data,'$.status','open','$.reopenedFrom',NEW.id),revision=revision+1,updated_at=NEW.updated_at WHERE owner=NEW.owner AND kind='installments' AND json_extract(data,'$.status')='restructured' AND id IN (SELECT installment_id FROM allocations WHERE payment_id=NEW.id AND owner=NEW.owner);
END;
--> statement-breakpoint
CREATE TRIGGER operation_guard_cleanup AFTER INSERT ON operation_guards BEGIN DELETE FROM operation_guards WHERE id=NEW.id; END;
--> statement-breakpoint
CREATE TRIGGER stock_guard_cleanup AFTER INSERT ON stock_guards BEGIN DELETE FROM stock_guards WHERE id=NEW.id; END;
