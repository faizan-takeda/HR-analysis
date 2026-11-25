const assert=require('node:assert/strict'), M=require('../js/executive.js');
assert.deepEqual(M.allocation(12,6,4),{used:6,transfer:4,gap:2});assert.equal(M.allocation(5,10,10).gap,0);assert.equal(M.allocation(20,0,0).gap,20);
assert.deepEqual(M.team(0),{now:2,later:3,hires:3,developed:0});assert.deepEqual(M.team(1),{now:0,later:3,hires:0,developed:3});assert.deepEqual(M.team(2),{now:2,later:3,hires:2,developed:1});
assert.deepEqual(M.network(20),{essential:10,extra:30,upkeep:5,before:40,after:15,delta:25});assert.equal(M.network(4).before,6);assert.equal(M.network(40).after,30);assert.equal(M.network(5).upkeep,1.25);
for(let n=4;n<=40;n++){const v=M.network(n);assert.ok(v.before<=n*(n-1)/2);assert.equal(v.delta,v.before-v.after);assert.ok(v.delta>=0)}
assert.deepEqual(M.ownership(20,5000),{bad:6,good:2,review:5000,before:30000,after:15000,delta:15000});assert.equal(M.ownership(20,1000).delta,-1000);assert.equal(M.ownership(100,10000).delta,175000);assert.equal(M.gate(2),'stop');assert.equal(M.gate(1),'scale');
console.log('All model assertions passed (including all 37 team-count values).');
