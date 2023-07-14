import './style.css';

import * as THREE from 'three';
// @ts-ignore
import Stats from 'three/addons/libs/stats.module.js';
// @ts-ignore
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

import ThreeFIFOCache from '../src';

// Setup GUI
const gui = new GUI();
const params = {
    numberOfGenerations: 10,
    numberOfCubes: 1_000,
    cacheSize: 10,
    timestampRegular: 'N/A',
    timestampCache: 'N/A',
};

const settingsFolder = gui.addFolder('Settings');
settingsFolder.add(params, 'numberOfGenerations', 1, 1_000, 1).name('# Generations');
settingsFolder.add(params, 'numberOfCubes', 1, 10_000, 1).name('# Cubes (in each gen)');
settingsFolder.add(params, 'cacheSize', 1, 100, 1).name('Cache size');

const statsFolder = gui.addFolder('Stats');
statsFolder.add(params, 'timestampRegular').name('Regular Time (ms)').listen();
statsFolder.add(params, 'timestampCache').name('Cached Time (ms)').listen();

// Setup FIFO cache
const cache = new ThreeFIFOCache(params.cacheSize);

// Setup a basic THREE.js scene
const stats = new Stats();
document.body.appendChild(stats.dom);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Setup basic geometry and materials
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const cacheMissMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
const cacheHitMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });

// Setup raycaster
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

/**
 * Update the pointer.
 */
const onPointerMove = (event: PointerEvent): void => {
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
};

window.addEventListener('pointermove', onPointerMove);

let previousObjects: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>[] = [];

/**
 * Perform a raycast and see if the object was cached.
 * The raycast bit has nothing to do with the cache, it's just a way to get a random object.
 *
 * With a random object, try to fetch it from the cache.
 * If it's a cache hit, change the material to red.
 * If it's a cache miss, change the material to white.
 *
 * For both cases, record the time it took to do the lookup.
 *
 */
const testPerformance = (): void => {
    // Begin raycast
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(scene.children);

    // Reset all materials
    for (let i = 0; i < previousObjects.length; i++) {
        const element = previousObjects[i];
        element.material = material;
    }

    // If no object was hit, return
    const intersect = intersects[0];
    if (!intersect) return;
    // This is our random object that we hit
    const randomObject = intersect.object as THREE.Mesh<
        THREE.BufferGeometry,
        THREE.MeshBasicMaterial
    >;

    // Try to fetch the object from the cache
    let cachedObject: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
    // If cache miss, fetch the object from the scene
    let regularFetchedObject: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;

    // Measure time for regular lookup
    let start = performance.now();

    // @ts-ignore
    cachedObject = cache.get<THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>>(
        randomObject.uuid,
    );

    if (cachedObject) {
        // If cache hit, simply change the material
        cachedObject.material = cacheHitMaterial;
    } else {
        // Else, restart start time and do regular lookup
        start = performance.now();

        // Then, traverse the scene and find the object.
        // This should be really slow (!) for many generations.
        scene.traverse((child) => {
            if (child.uuid === randomObject.uuid) {
                regularFetchedObject = child as THREE.Mesh<
                    THREE.BufferGeometry,
                    THREE.MeshBasicMaterial
                >;
            }
        });

        if (regularFetchedObject! == null) return;
        regularFetchedObject.material = cacheMissMaterial;
    }

    // Finally, measure time it to for either lookup
    const end = performance.now();

    // Write time to GUI
    if (cachedObject) {
        params.timestampCache = `${end - start}`;
    } else {
        params.timestampRegular = `${end - start}`;
        // Cache the object so that we can use it latter.
        cache.put(regularFetchedObject!.uuid, regularFetchedObject!);
    }

    // Add to elements array for debug.
    previousObjects.push(randomObject);
};

const animate = (): void => {
    requestAnimationFrame(animate);
    testPerformance();
    stats.update();

    renderer.render(scene, camera);
};

animate();

/**
 * Initialize the cubes.
 */
const init = () => {
    const actualNumberOfCubes = Math.max(params.numberOfGenerations, params.numberOfCubes);
    camera.position.x = actualNumberOfCubes / 4;
    camera.position.y = actualNumberOfCubes / 4;

    camera.position.z = actualNumberOfCubes / 4;

    scene.clear();
    cache.setMaxItems(params.cacheSize);
    cache.flush();

    let oldParent = scene;
    for (let i = 0; i < params.numberOfGenerations; i++) {
        const parent = new THREE.Scene();
        oldParent.add(parent);
        for (let j = 0; j < params.numberOfCubes; j++) {
            const cube = new THREE.Mesh(geometry, material);
            cube.matrixAutoUpdate = false;

            cube.position.x = (Math.random() * actualNumberOfCubes) / 2;
            cube.position.y = (Math.random() * actualNumberOfCubes) / 2;
            cube.position.z = (Math.random() * actualNumberOfCubes) / 2;
            cube.updateMatrix();

            parent.add(cube);
            cache.put(cube.uuid, cube);
        }
        oldParent = parent;
    }
};

settingsFolder.add({ init }, 'init').name('Re-initialize');

init();
