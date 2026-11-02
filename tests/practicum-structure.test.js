import test from 'node:test';
import assert from 'node:assert/strict';
import {Mat4,Vec3,degToRad} from '../math3d.js';
import {createNode,traverse} from '../hierarchy.js';

const near=(a,b)=>a.forEach((v,i)=>assert.ok(Math.abs(v-b[i])<1e-5,`${a} != ${b}`));

test('the teaching matrix helpers use the same column-vector convention as the actual scene',()=>{
  const angle=degToRad(90);
  let model=Mat4.translation(3,-2,4);
  for(const matrix of [Mat4.rotationZ(angle),Mat4.rotationY(angle),Mat4.rotationX(angle),Mat4.scaling(2,3,4)])model=Mat4.multiply(model,matrix);
  near(Mat4.transformPoint(model,[1,1,1]),[7,1,2]);
  near([...model],[...Mat4.compose([3,-2,4],[angle,angle,angle],[2,3,4])]);
  near(Vec3.add([1,2,3],[4,5,6]),[5,7,9]);
  near(Vec3.cross([1,0,0],[0,1,0]),[0,0,1]);
  near(Vec3.normalize([0,0,0]),[0,0,0]);
  assert.equal(Vec3.dot([1,2,3],[4,5,6]),32);
});

test('the live matrix-stack traversal restores the parent before visiting a sibling',()=>{
  const root=createNode('root',{position:[3,2,1]}),arm=createNode('arm',{rotation:[0,0,degToRad(90)]}),tip=createNode('tip',{position:[2,0,0]}),sibling=createNode('sibling',{position:[0,5,0]});
  arm.add(tip);root.add(arm,sibling);
  const order=[];traverse(root,node=>order.push(node.name));
  assert.deepEqual(order,['root','arm','tip','sibling']);
  near(Mat4.transformPoint(tip.worldMatrix,[0,0,0]),[3,4,1]);
  near(Mat4.transformPoint(sibling.worldMatrix,[0,0,0]),[3,7,1]);
  near(Mat4.transformPoint(root.worldMatrix,[0,0,0]),[3,2,1]);
  arm.rotation[2]=0;root.updateWorldMatrix();
  near(Mat4.transformPoint(tip.worldMatrix,[0,0,0]),[5,2,1]);
  near(Mat4.transformPoint(sibling.worldMatrix,[0,0,0]),[3,7,1]);
});

test('hidden branches are skipped for drawing while world-matrix inspection can include them',()=>{
  const root=createNode('root',{position:[4,0,0]}),hidden=createNode('hidden',{position:[2,0,0],visible:false}),child=createNode('child',{position:[1,0,0]}),sibling=createNode('sibling');
  hidden.add(child);root.add(hidden,sibling);
  const drawn=[];traverse(root,n=>drawn.push(n.name),{visibleOnly:true});
  assert.deepEqual(drawn,['root','sibling']);
  root.updateWorldMatrix();near(Mat4.transformPoint(child.worldMatrix,[0,0,0]),[7,0,0]);
});
