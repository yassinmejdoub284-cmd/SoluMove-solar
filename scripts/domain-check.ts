import assert from 'node:assert/strict';
import {toMillimes,totals,plan,monthlyDates,validate,payroll} from '../lib/solar/domain.ts';
import {modules} from '../lib/solar/modules.ts';
import {demoEntries} from '../lib/solar/demo.ts';
assert.equal(toMillimes('123,456'),123456);
assert.throws(()=>toMillimes('1.1234'));
assert.throws(()=>toMillimes('-1'));
assert.equal(totals([{description:'PV',quantity:3,price:100000,tax:19}],30000,1000).total,322300);
const p=plan(1000001,12,'2026-01-31');assert.equal(p.reduce((n,e)=>n+e.amount,0),1000001);assert.equal(p[1].dueDate,'2026-02-28');assert.equal(p[2].dueDate,'2026-03-31');
assert.equal(monthlyDates('2028-01-31',2)[1],'2028-02-29');
assert.throws(()=>plan(10,12,'2026-01-31'));
assert.throws(()=>validate('effects',{name:'Bad cheque',instrument:'cheque',number:'123',beneficiary:'Client',date:'2026-01-01',amount:30000000,ceiling:20000000,validUntil:'2026-10-01'}));
assert.throws(()=>validate('payroll',{name:'Bad payroll',employeeId:'x',period:'2026-10',base:1000000,incomeTax:2000000,calculationSource:'reviewed'}));
assert.equal(payroll({base:1000000,bonus:200000,cnssDeduction:100000,incomeTax:150000,employerCharges:180000}).net,950000);
const sample=demoEntries();assert.equal(new Set(sample.map(e=>e.id)).size,sample.length);
for(const m of modules){assert.equal(m.title.length,3);assert.equal(m.singular.length,3);assert.ok(m.states.length);for(const f of m.fields)assert.equal(f.label.length,3);}
console.log('PASS: financial rounding, installment conservation, month-end dates, payroll checks, cheque ceilings, sample records and 3-language module coverage.');
