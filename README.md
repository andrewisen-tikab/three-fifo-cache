# three-fifo-cache

A First in first out (FIFO) cache implementation in three.js.

## Installation

```bash
npm install three-fifo-cache
```

or

```bash
yarn add three-fifo-cache
```

## Is this useful?

This class is useful in very specific situations.
For most everyday usage, a simple traversal of the scene graph is enough.

```ts
let object = null;
scene.traverse((child) => {
    if (child.uuid === 'my-uuid') {
        object = child;
    }
});
```

However, if you have a **large scene** graph with **multiple generations**
(children, grand-children, grand-grand-children, etc.) and you need to access a specific object multiple times, then this class can be useful.

## Usage

First, import the module and setup the cache.

```ts
import FIFO from 'three-fifo-cache';

const maxItems = 10;
const cache = new FIFO(maxItems);
```

Then simply use the cache to store and retrieve items.

```ts
import * as THREE from 'three';

// Store an item
const object = new THREE.Object3D();
cache.set(object.uuid, object);

// Retrieve an item
const item = cache.get(object.uuid);
```

N.B: You can use any key you want.

Use `flush` to clear the cache.

```ts
cache.flush();
```

## Example

A simple example is available in the `example` folder.
Or, a live version is available at:

[https://andrewisen-tikab.github.io/three-fifo-cache/example/](https://andrewisen-tikab.github.io/three-fifo-cache/example/)

## Status

This is a work in progress. It has not been tested in production code.
