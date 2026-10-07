import { db } from '../../db/client';
import { listQuery } from '../../db/repositories/photos';
import { photos, type NewPhoto } from '../../db/schema';

/**
 * Reto opcional Semana 7: Mide el rendimiento de inserción y consulta
 * de 1.000 fotografías utilizando el índice sobre `created_at`.
 */
export async function runBenchmark(count = 1000): Promise<{ count: number; seedTimeMs: number; queryTimeMs: number }> {
  const dummyPhotos: NewPhoto[] = Array.from({ length: count }, (_, index) => ({
    uri: `file:///benchmark/photo_${index + 1}.jpg`,
    source: index % 2 === 0 ? 'camera' : 'gallery',
    latitude: 4.6097 + (Math.random() - 0.5) * 0.1,
    longitude: -74.0817 + (Math.random() - 0.5) * 0.1,
    accuracy: 5.0,
    note: `Foto de prueba benchmark ${index + 1}`,
    favorite: index % 5 === 0,
    createdAt: new Date(Date.now() - Math.floor(Math.random() * 1000000000)),
  }));

  const startSeed = performance.now();
  console.time(`Seed ${count} fotos`);
  // Insertar en lotes de 100 para optimizar llamadas SQLite
  const batchSize = 100;
  for (let i = 0; i < dummyPhotos.length; i += batchSize) {
    await db.insert(photos).values(dummyPhotos.slice(i, i + batchSize));
  }
  console.timeEnd(`Seed ${count} fotos`);
  const endSeed = performance.now();

  const startQuery = performance.now();
  console.time(`Consulta 1.000 fotos con índice`);
  const results = await listQuery();
  console.timeEnd(`Consulta 1.000 fotos con índice`);
  const endQuery = performance.now();

  return {
    count: results.length,
    seedTimeMs: Math.round(endSeed - startSeed),
    queryTimeMs: Math.round(endQuery - startQuery),
  };
}

