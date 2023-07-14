import './style.css';

import * as THREE from 'three';
import Stats from 'three/addons/libs/stats.module.js';

import ThreeFIFOCache from '../src';

const cache = new ThreeFIFOCache(50);

const stats = new Stats();
document.body.appendChild(stats.dom);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const geometry = new THREE.BoxGeometry(1, 1, 1);

camera.position.z = 10;

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
        element.material.color.set(0x00ff00);
    }

    for (let i = 0; i < intersects.length; i++) {
        const object = intersects[i].object as THREE.Mesh<
            THREE.BufferGeometry,
            THREE.MeshBasicMaterial
        >;

        const cacheObject = cache.get<THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>>(
            object.uuid,
        );

        if (cacheObject) {
            cacheObject.material.color.set(0xff0000);
        } else {
            object.material.color.set(0xffffff);
            // cache.put(object.uuid, object);
        }

        elements.push(object);
    }
};

function animate() {
    requestAnimationFrame(animate);
    debug();
    stats.update();

    renderer.render(scene, camera);
}

animate();

const build = () => {
    cache.flush();
    for (let i = 0; i < 100; i++) {
        const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        const cube = new THREE.Mesh(geometry, material);
        cube.matrixAutoUpdate = false;

        cube.position.x = Math.random() * 10 - 5;
        cube.position.y = Math.random() * 10 - 5;
        cube.position.z = Math.random() * 10 - 5;
        cube.updateMatrix();

        scene.add(cube);
        cache.put(cube.uuid, cube);
    }
};

build();
