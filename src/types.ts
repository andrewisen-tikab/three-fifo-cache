export type Value = THREE.Object3D;

export type Node<T = Value> = {
    key: string;
    value: T;
    previous?: Node | null;
};
