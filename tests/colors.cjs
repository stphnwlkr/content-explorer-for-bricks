'use strict';
const assert = require('node:assert/strict');
const { ratio, readable, mix, hover } = require('../assets/colors.js');
const hex = value => value.match(/\w\w/g).map(v => parseInt(v, 16));
assert.equal(ratio([0, 0, 0], [255, 255, 255]), 21);
assert.equal(ratio([120, 120, 120], [120, 120, 120]), 1);
let pairs = 0;
for (const backgrounds of [
  ['161a1c', '22282d', '22282d'], // Bricks dark
  ['ffffff', 'eeeeee', 'f5f5f5'], // Bricks light
  ['f5efe4', 'e5ddca', 'fffaf2'], // Warm custom
  ['191a2a', '242846', '151527'], // Cool custom
  ['161a1c', '202428', '22282d', '51492a'], // Reported selected card
]) {
  const surfaces = backgrounds.map(hex);
  for (const color of ['8b9da8', 'ffff00', '888888', '4691e1', 'a773e8', 'c48b1e', 'ffffff', '000000']) {
    const result = readable(hex(color), surfaces);
    for (const bg of surfaces) { assert.ok(ratio(result, bg) >= 4.6); pairs++; }
    assert.deepEqual(readable(result, surfaces), result, 'Normalization is stable');
    const inverse = readable([130, 130, 130], [result]);
    assert.ok(ratio(inverse, result) >= 4.6, 'Filled action label');
  }
  const border = readable([80, 80, 80], surfaces, 3.1);
  for (const bg of surfaces) assert.ok(ratio(border, bg) >= 3.1);
}
assert.deepEqual(readable([255,255,255], [[0,0,0]]), [255,255,255], 'Passing native colors stay intact');
for (const [bg, fg] of [['292929','f7f7f8'], ['fafafa','222222'], ['ffcf4d','202124'], ['b2226a','ffffff']]) {
  const before = ratio(hex(bg),hex(fg)), after = hover(hex(bg),hex(fg));
  assert.ok(ratio(after,hex(fg)) >= before, 'Custom hover retains or improves label contrast');
  assert.notDeepEqual(after,hex(bg), 'Hover background visibly changes');
}
const original = ['3858e9','0a9d8f','9b51e0','e0633a','c9920a','d6336c','2f9e44','5c7080'];
for (const dark of [true,false]) {
 const surface=hex(dark?'161a1c':'f9fafb'), soft=hex(dark?'22282d':'e8ebee'), text=hex(dark?'e2e6e9':'161a1d');
 const controls=[surface,soft,mix(soft,text,.04),mix(soft,text,.12)];
 for(const color of original) {
  const dot=readable(hex(color),controls,3.1);
  for(const bg of controls) assert.ok(ratio(dot,bg)>=3.1,'Graph markers on normal and hover surfaces');
 }
 const accent=readable(hex(dark?'ffd54d':'f52280'),[surface,soft]);
 const tint=mix(surface,accent,.26), primaryHover=mix(accent,[0,0,0],.12);
 const inverse=readable(hex(dark?'1e2124':'ffffff'),[accent,primaryHover]);
 for(const bg of [accent,primaryHover]) assert.ok(ratio(inverse,bg)>=4.6,'Primary button normal/hover');
 const foreground=readable(text,[...controls,tint]);
 for(const bg of [...controls,tint]) assert.ok(ratio(foreground,bg)>=4.6,'Full-strength text in selected and hover states');
}
assert.deepEqual(mix([0,0,0],[100,100,100],.26), [26,26,26]);
console.log(`PASS: ${pairs} foreground/background pairs, original graph palette, hover states, inverse labels, control borders, stable normalization`);
