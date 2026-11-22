import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const CHUNK_SIZE = 1000;
const countKey = (key: string) => `${key}.chunks`;
const chunkKey = (key: string, i: number) => `${key}.${i}`;

const memoryStore = new Map<string, string>();

function getStorage(): Storage | null {
  if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
    return window.localStorage;
  }
  return null;
}

async function readCount(key: string): Promise<number> {
  if (Platform.OS === 'web') {
    const storage = getStorage();
    if (!storage) {
      return Number(memoryStore.get(countKey(key)) ?? 0);
    }
    return Number(storage.getItem(countKey(key)) ?? 0);
  }
  return Number((await SecureStore.getItemAsync(countKey(key))) ?? 0);
}

async function removeItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    const storage = getStorage();
    const count = await readCount(key);
    for (let i = 0; i < count; i++) {
      if (storage) {
        storage.removeItem(chunkKey(key, i));
      } else {
        memoryStore.delete(chunkKey(key, i));
      }
    }
    if (storage) {
      storage.removeItem(countKey(key));
      storage.removeItem(key);
    } else {
      memoryStore.delete(countKey(key));
      memoryStore.delete(key);
    }
    return;
  }

  const count = await readCount(key);
  for (let i = 0; i < count; i++) {
    await SecureStore.deleteItemAsync(chunkKey(key, i));
  }
  await SecureStore.deleteItemAsync(countKey(key));
  await SecureStore.deleteItemAsync(key);
}

export const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      const storage = getStorage();
      const count = await readCount(key);
      if (count === 0) {
        if (storage) {
          return storage.getItem(key) ?? null;
        }
        return memoryStore.get(key) ?? null;
      }
      let value = '';
      for (let i = 0; i < count; i++) {
        const chunk = storage
          ? storage.getItem(chunkKey(key, i))
          : (memoryStore.get(chunkKey(key, i)) ?? null);
        if (chunk === null) return null;
        value += chunk;
      }
      return value;
    }

    const count = await readCount(key);
    if (count === 0) {
      // Intento directo en caso de existir sin fragmentos
      const direct = await SecureStore.getItemAsync(key);
      return direct ?? null;
    }

    let value = '';
    for (let i = 0; i < count; i++) {
      const chunk = await SecureStore.getItemAsync(chunkKey(key, i));
      if (chunk === null) return null; // sesión incompleta
      value += chunk;
    }
    return value;
  },

  async setItem(key: string, value: string): Promise<void> {
    await removeItem(key);

    if (Platform.OS === 'web') {
      const storage = getStorage();
      const total = Math.ceil(value.length / CHUNK_SIZE);
      for (let i = 0; i < total; i++) {
        const part = value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
        if (storage) {
          storage.setItem(chunkKey(key, i), part);
        } else {
          memoryStore.set(chunkKey(key, i), part);
        }
      }
      if (storage) {
        storage.setItem(countKey(key), String(total));
      } else {
        memoryStore.set(countKey(key), String(total));
      }
      return;
    }

    const total = Math.ceil(value.length / CHUNK_SIZE);
    for (let i = 0; i < total; i++) {
      await SecureStore.setItemAsync(
        chunkKey(key, i),
        value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE)
      );
    }
    await SecureStore.setItemAsync(countKey(key), String(total));
  },

  removeItem,
};
