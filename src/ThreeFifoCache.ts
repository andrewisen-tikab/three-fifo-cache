/* eslint-disable class-methods-use-this */
import type { Value, Node } from './types';

/**
 * FIFO cache implementation in `three.js` that is used to cache `THREE.Object3D` instances.s
 * Items cached in object hash and age managed by linked list for O(1) performance.
 *
 * THis class can be used to cache any JavaScript object.
 * However, the TypeScript is written in a `three.js` context.
 *
 * @author André Wisén
 * @copyright MIT
 */
export default class ThreeFIFOCache {
    /**
     * Max items in cache.
     */
    private maxItems: number;

    /**
     * Cache.
     */
    private cache: { [key: string]: Node } = {};

    /**
     * Head Node.
     */
    private head: Node | null = null;

    /**
     * Tail Node.
     */
    private tail: Node | null = null;

    private cacheSize: number = 0;

    /**
     * Create `FIFOCache` object.
     */
    constructor(maxItems: number) {
        if (maxItems <= 0) throw new Error('maxItems must be greater than 0');

        this.maxItems = maxItems;
        this.init();
    }

    /**
     * Initialize `FIFOCache`.
     */
    private init(): void {
        this.cache = Object.create(null);
        this.head = null;
        this.tail = null;
        // Because we can't query cache size in O(1)
        this.cacheSize = 0;
    }

    /**
     * Make a cache node.
     * @param opts
     * @param spareNode
     * @returnss
     */
    private makeCacheNode<T = Value>(opts: Node<T>, spareNode: Node<T>): Node<T> {
        const newNode: Node<T> = spareNode || {
            key: undefined,
            value: undefined,
            previous: undefined,
        };
        newNode.key = opts.key;
        newNode.value = opts.value;
        newNode.previous = null;
        return newNode;
    }

    /**
     * Update position(s).
     * @param node
     */
    private addToHeadOfList<T = Value>(node: Node<T>): void {
        // If there is a head already it's now going to have a previous.
        if (this.head) {
            this.head.previous = node as Node;
        } else {
            // If there's no head, there's no tail either.
            this.tail = node as Node;
        }
        // This node becomes head
        this.head = node as Node;
        if (this.cacheSize === null) throw new Error('cacheSize is null');
        this.cacheSize += 1;
    }

    /**
     * Update position(s).
     * @returns
     */
    private removeTailFromList<T = Value>(): Node<T> {
        const node = this.tail;
        if (!node) throw new Error('node is null');

        // If there is a previous node, update it's next.
        this.tail = node.previous!;

        this.cacheSize -= 1;

        // Return this so it can be re-used.
        return node as Node<T>;
    }

    /**
     * Put a new `value` into the cache.
     * @param key
     * @param value
     */
    public put<T = Value>(key: string, value: T): void {
        let spareNode: Node<T>;
        const existingNode = this.cache[key];
        // If this is a new key add it to the list
        if (!existingNode) {
            // Check the cache size and prune if necessary.
            if (this.cacheSize >= this.maxItems) {
                spareNode = this.removeTailFromList<T>();
                delete this.cache[spareNode.key];
            }
        }
        // Get new node, optional re-using any that were removed above.
        const newNode = this.makeCacheNode<T>(
            {
                key,
                value,
            },
            spareNode!,
        );
        // Update position
        this.addToHeadOfList<T>(newNode);
        this.cache[key] = newNode as Node;
    }

    /**
     * Get a a value from the cache.
     * Returns `null` if it's a cache miss.
     * @param key
     * @returns
     */
    get<T = Value>(key: string): T | null {
        const node = this.cache[key];
        if (!node) return null;
        return node.value as T | null;
    }

    /**
     * Flush entire cache and rebuild.
     */
    flush(): void {
        this.init();
    }

    /**
     * @deprecated WIP
     * @param maxItems
     */
    public setMaxItems(maxItems: number): void {
        if (maxItems <= 0) throw new Error('maxItems must be greater than 0');
        this.maxItems = maxItems;
    }
}
