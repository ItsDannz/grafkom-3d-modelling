import test from 'node:test';
import assert from 'node:assert/strict';
import { Mat4 } from '../js/math.js';
import { createPrimitives } from '../js/geometry.js';

const close = (actual, expected, tolerance = 1e-5) => {
  assert.equal(actual.length, expected.length);
  actual.forEach((value, i) => assert.ok(Math.abs(value - expected[i]) < tolerance, `${i}: ${value} ≠ ${expected[i]}`));
};

test('child follows translated/rotated parent without moving a sibling', () => {
  const parent = Mat4.compose([3, 0, 2], [0, Math.PI / 2, 0], [1, 1, 1]);
  const child = Mat4.compose([2, 0, 0], [0, 0, 0], [1, 1, 1]);
  const sibling = Mat4.compose([0, 1, 0], [0, 0, 0], [1, 1, 1]);
  close(Mat4.transformPoint(Mat4.multiply(parent, child), [0, 0, 0]), [3, 0, 0]);
  close(Mat4.transformPoint(Mat4.multiply(parent, sibling), [0, 0, 0]), [3, 1, 2]);
  close(Mat4.transformPoint(parent, [0, 0, 0]), [3, 0, 2]);
});

test('inverse restores points after nonuniform scaling and three-axis rotation', () => {
  const matrix = Mat4.compose([4, -2, 7], [.4, -.8, .2], [2, .5, 3]);
  const inverse = Mat4.invert(matrix);
  for (const point of [[0, 0, 0], [1, 2, 3], [-2, 7, .3]])
    close(Mat4.transformPoint(inverse, Mat4.transformPoint(matrix, point)), point);
  assert.equal(Mat4.invert(Mat4.compose([0, 0, 0], [0, 0, 0], [1, 0, 1])), null);
});

test('view matrix sends eye to origin and target down negative Z', () => {
  const eye = [9, 7, 12], target = [1, 2, -1];
  const view = Mat4.lookAt(eye, target);
  close(Mat4.transformPoint(view, eye), [0, 0, 0]);
  close(Mat4.transformPoint(view, target), [0, 0, -Math.hypot(...eye.map((v, i) => v - target[i]))]);
  for (const matrix of [Mat4.lookAt([0, 0, 0], [0, 0, 0]), Mat4.lookAt([0, 1, 0], [0, 0, 0])])
    assert.ok(Array.from(matrix).every(Number.isFinite));
});

test('perspective maps near/far planes to WebGL clip bounds', () => {
  const projection = Mat4.perspective(Math.PI / 3, 16 / 9, .2, 150);
  close(Mat4.transformPoint(projection, [0, 0, -.2]), [0, 0, -1]);
  close(Mat4.transformPoint(projection, [0, 0, -150]), [0, 0, 1]);
});

test('all primitive meshes have finite attributes and valid outward faces', () => {
  for (const [name, mesh] of Object.entries(createPrimitives())) {
    const vertices = mesh.positions.length / 3;
    assert.equal(mesh.normals.length, vertices * 3, name);
    assert.equal(mesh.uvs.length, vertices * 2, name);
    assert.equal(mesh.indices.length % 3, 0, name);
    assert.ok([...mesh.positions, ...mesh.normals, ...mesh.uvs].every(Number.isFinite), name);
    assert.ok(mesh.indices.every(index => Number.isInteger(index) && index >= 0 && index < vertices), name);
    let nondegenerate = 0;
    for (let i = 0; i < mesh.indices.length; i += 3) {
      const ids = mesh.indices.slice(i, i + 3);
      const p = ids.map(index => mesh.positions.slice(index * 3, index * 3 + 3));
      const a = p[1].map((v, j) => v - p[0][j]), b = p[2].map((v, j) => v - p[0][j]);
      const cross = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
      if (Math.hypot(...cross) < 1e-9) continue;
      const normals = ids.map(index => mesh.normals.slice(index * 3, index * 3 + 3));
      const normal = [0, 1, 2].map(j => normals.reduce((sum, n) => sum + n[j], 0));
      assert.ok(cross.reduce((sum, v, j) => sum + v * normal[j], 0) > 0, `${name}: winding faces away from normal`);
      nondegenerate++;
    }
    assert.ok(nondegenerate > 0, name);
  }
});
