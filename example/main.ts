import './style.css';

import * as THREE from 'three';
// @ts-ignore
import Stats from 'three/addons/libs/stats.module.js';
// @ts-ignore
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

import ThreeFIFOCache from '../src';

const gui = new GUI();
const params = {
    size: 100,
    numberOfGenerations: 100,
    numberOfCubes: 100,
    cacheSize: 10,
    timestampRegular: 'N/A',
    timestampCache: 'N/A',
};

const settingsFolder = gui.addFolder('Settings');
settingsFolder.add(params, 'numberOfCubes', 0, 1_000, 1).name('Number of cubes');
settingsFolder.add(params, 'cacheSize', 0, 100, 1).name('Cache size');

const statsFolder = gui.addFolder('Stats');
statsFolder.add(params, 'timestampRegular').name('Regular Time (ms)').listen();
statsFolder.add(params, 'timestampCache').name('Cached Time (ms)').listen();

const cache = new ThreeFIFOCache(params.cacheSize);

const stats = new Stats();
document.body.appendChild(stats.dom);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const cacheMissMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
const cacheHitMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

const onPointerMove = (event: PointerEvent) => {
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
};
window.addEventListener('pointermove', onPointerMove);

let elements: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>[] = [];
const debug = () => {
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(scene.children);

    for (let i = 0; i < elements.length; i++) {
        const element = elements[i];
        element.material = material;
    }

    const intersect = intersects[0];
    if (!intersect) return;
    const object = intersect.object as THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;

    let cachedObject: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
    let regularFetchedObject: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;

    // Measure time for regular lookup
    let start = performance.now();

    // @ts-ignore
    cachedObject = cache.get<THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>>(
        object.uuid,
    );

    // If cache hit
    if (cachedObject) {
        cachedObject.material = cacheHitMaterial;
    } else {
        // Else, restart start time and do regular lookup
        start = performance.now();

        // This should be really slow for many generations
        scene.traverse((child) => {
            if (child.uuid === object.uuid) {
                regularFetchedObject = child as THREE.Mesh<
                    THREE.BufferGeometry,
                    THREE.MeshBasicMaterial
                >;
            }
        });

        if (regularFetchedObject! == null) return;
        regularFetchedObject.material = cacheMissMaterial;
    }

    // Either cached or regular object.
    const end = performance.now();

    // Write time to GUI
    if (cachedObject) {
        params.timestampCache = `${end - start}`;
    } else {
        params.timestampRegular = `${end - start}`;
        // Cache the object
        cache.put(regularFetchedObject!.uuid, regularFetchedObject!);
    }

    // Add to elements array for debug
    elements.push(object);
};

function animate() {
    requestAnimationFrame(animate);
    debug();
    stats.update();

    renderer.render(scene, camera);
}

animate();

const init = () => {
    const actualNumberOfCubes = params.size;
    camera.position.x = actualNumberOfCubes / 2;
    camera.position.y = actualNumberOfCubes / 2;

    camera.position.z = actualNumberOfCubes / 2;

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

            cube.position.x = Math.random() * actualNumberOfCubes;
            cube.position.y = Math.random() * actualNumberOfCubes;
            cube.position.z = Math.random() * actualNumberOfCubes;
            cube.updateMatrix();

            parent.add(cube);
            cache.put(cube.uuid, cube);
        }
        oldParent = parent;
    }
};

gui.add({ init }, 'init').name('Re-initialize');

init();
