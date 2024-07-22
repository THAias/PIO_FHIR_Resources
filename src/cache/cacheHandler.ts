import * as fs from "fs";
import * as path from "path";

import { root } from "../Helper";

// Cache handler configuration
export const CACHE_FOLDER: string = path.join(root, ".cache");
export const DEFAULT_CACHE_EXPIRY_S: number = 60 * 60 * 24 * 7 * 4; // 4 weeks

/**
 * @property {string} folder optional folder
 * @property {number} expiry the date when the cache expire
 */
export interface CacheOptions {
    folder?: string;
    expiry?: number;
}

/**
 * @property {number} timestamp the timestamp when the cache was created
 * @property {T} data the cached data
 * @template T the type of the data to cache
 */
export interface Cache<T> {
    timestamp: number;
    data: T;
}

/**
 * Function to get the cached data
 * @template T the type of the data to get
 * @param {string} key the unique cache key
 * @param {CacheOptions} options options as CacheOptions
 * @returns {Promise<T | null>} The returned cache if possible
 */
export async function getFromCache<T>(key: string, options?: CacheOptions): Promise<T | null> {
    const cacheFolder: string = options?.folder || CACHE_FOLDER;
    const cacheExpiry: number = options?.expiry || DEFAULT_CACHE_EXPIRY_S;
    const cachePath: string = getCachePath(key, cacheFolder);

    try {
        const data: string = await fs.promises.readFile(cachePath, "utf-8");
        const cache: Cache<T> = JSON.parse(data) as Cache<T>;
        if (cache.timestamp + cacheExpiry > getTimestampInSeconds()) {
            return cache.data; // Return cached data if not expired
        } else {
            await fs.promises.unlink(cachePath); // Delete expired cache file
            return null; // Cache expired, return null
        }
    } catch (error) {
        return null; // Cache not found, return null
    }
}

/**
 * Save data to cache
 * @template T the type of the data to save
 * @param {string} key unique cache key
 * @param {T} data tha data to save
 * @param {CacheOptions} options options as CacheOptions
 */
export async function saveToCache<T>(key: string, data: T, options?: CacheOptions): Promise<void> {
    const cacheFolder: string = options?.folder || CACHE_FOLDER;
    const cachePath: string = getCachePath(key, cacheFolder);
    const cache: Cache<T> = {
        timestamp: getTimestampInSeconds(),
        data: data,
    };
    await fs.promises.mkdir(path.dirname(cachePath), { recursive: true }); // Create cache folder if not exists
    await fs.promises.writeFile(cachePath, JSON.stringify(cache), "utf-8");
}

/**
 * Helper function to get the cache path
 * @param {string} key the unique cache key
 * @param {string} cacheFolder the folder path where the cache is saved to
 * @returns {string} the cache file path
 */
export function getCachePath(key: string, cacheFolder: string): string {
    const cacheFileName: string = `${key}.json`;
    return path.join(cacheFolder, cacheFileName);
}

/**
 * Helper function to get the current time as number
 * @returns {number} the current time as number
 */
export function getTimestampInSeconds(): number {
    return Math.floor(Date.now() / 1000);
}
