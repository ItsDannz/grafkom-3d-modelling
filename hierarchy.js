import {Mat4} from './math3d.js';

/**
 * Satu simpul scene graph menyimpan transformasi LOKAL. Matriks dunia anak
 * adalah parentWorld * T * Rz * Ry * Rx * S; sibling tetap independen.
 */
export class Node3D {
  constructor(name,options={}) {
    this.name=name;
    this.position=[...(options.position??[0,0,0])];
    this.rotation=[...(options.rotation??[0,0,0])];
    this.scale=[...(options.scale??[1,1,1])];
    this.mesh=options.mesh??null;
    this.material=options.material??{};
    this.children=[];
    this.parent=null;
    this.visible=options.visible??true;
    this.localMatrix=Mat4.identity();
    this.worldMatrix=Mat4.identity();
    if(options.children)this.add(...options.children);
  }
  add(...children) {
    for(const child of children) {
      if(!(child instanceof Node3D))throw new TypeError('Anak scene harus berupa Node3D.');
      for(let ancestor=this;ancestor;ancestor=ancestor.parent) {
        if(ancestor===child)throw new Error('Scene graph tidak boleh memiliki hubungan melingkar.');
      }
      if(child.parent)child.parent.remove(child);
      child.parent=this;this.children.push(child);
    }
    return this;
  }
  remove(...children) {
    for(const child of children) {
      const index=this.children.indexOf(child);
      if(index!==-1){this.children.splice(index,1);child.parent=null;}
    }
    return this;
  }
  updateWorldMatrix(parentWorld=null) {
    return traverse(this,()=>{},{parentWorld});
  }
}

/** Sama perannya dengan createNode pada figure.js; children berisi semua anak. */
export function createNode(name,options={}) {
  return new Node3D(name,options);
}

/**
 * Pola traverse pada contoh robot: push parent → kalikan lokal → kunjungi anak
 * → pop parent sebelum sibling berikutnya. Matriks tiap node disimpan terpisah
 * supaya cabang yang bergerak tidak mengubah transformasi saudara cabangnya.
 */
export function traverse(root,visit,{parentWorld=null,visibleOnly=false}={}) {
  const stack=[];
  let modelMatrix=parentWorld;
  function walk(node) {
    if(visibleOnly&&!node.visible)return;
    stack.push(modelMatrix);
    Mat4.compose(node.position,node.rotation,node.scale,node.localMatrix);
    if(modelMatrix)Mat4.multiply(modelMatrix,node.localMatrix,node.worldMatrix);
    else node.worldMatrix.set(node.localMatrix);
    modelMatrix=node.worldMatrix;
    visit(node,modelMatrix);
    for(const child of node.children)walk(child);
    modelMatrix=stack.pop();
  }
  if(root)walk(root);
  return root;
}

