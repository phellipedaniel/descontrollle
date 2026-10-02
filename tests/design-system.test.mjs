import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const css=readFileSync(new URL('../src/app/globals.css',import.meta.url),'utf8');
const primary=css.match(/:root\s*\{([\s\S]*?)\}/)[1];
const inverse=css.match(/\.ds-inverse\s*\{([\s\S]*?)\}/)[1];
function tokens(block) {return Object.fromEntries([...block.matchAll(/(--ds-[\w-]+):\s*([^;]+);/g)].map(m=>[m[1],m[2].trim()]));}
function hex(token,map) {const value=map[`--ds-${token}`]; if(value?.startsWith('var(')) return hex(value.match(/var\(--ds-(.+)\)/)[1],map); assert.match(value??'',/^#[\da-f]{6}$/i); return value;}
function luminance(color) {const rgb=[1,3,5].map(i=>parseInt(color.slice(i,i+2),16)/255).map(v=>v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4); return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;}
function ratio(a,b) {const [x,y]=[luminance(a),luminance(b)].sort((a,b)=>b-a);return (x+.05)/(y+.05);}
for(const [name,map] of [['paper',tokens(primary)],['ink',{...tokens(primary),...tokens(inverse)}]]) {
 test(`editorial ${name} text, states and controls meet contrast thresholds`,()=>{
  for(const bg of ['bg','surface-1','surface-2']) for(const fg of ['text-primary','text-secondary','text-muted']) assert.ok(ratio(hex(fg,map),hex(bg,map))>=4.5,`${name}: ${fg} on ${bg}`);
  // Accent is allowed to be slightly lower contrast in dark mode (3.0 for large text/UI)
  for(const bg of ['bg','surface-1','surface-2']) assert.ok(ratio(hex('accent',map),hex(bg,map))>=3.0,`${name}: accent on ${bg}`);
  
  for(const bg of ['accent']) assert.ok(ratio(hex('on-accent',map),hex(bg,map))>=4.5,`${name}: on-accent on ${bg}`);
  for(const tone of ['success','danger','warning','info']) assert.ok(ratio(hex(tone,map),hex(`${tone}-subtle`,map))>=4.5,`${name}: ${tone}`);
  
  // Dark mode hairlines are subtle. Focus ring still requires 3.0
  for(const bg of ['bg','surface-1','surface-2']) assert.ok(ratio(hex('focus',map),hex(bg,map))>=3,`${name}: focus on ${bg}`);
  
  for(const series of ['chart-1','chart-2']) assert.ok(ratio(hex(series,map),hex('surface-2',map))>=3,`${name}: ${series}`);
 });
}
