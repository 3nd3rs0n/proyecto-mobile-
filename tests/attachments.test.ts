import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import { createPhotoStorage, type FileGateway } from '../src/services/photo-storage';

function memoryFiles(documentDirectory: string | null = 'file:///docs/'): FileGateway & {
  files: Map<string, string>;
  directories: Set<string>;
} {
  const files = new Map<string, string>();
  const directories = new Set<string>();
  return {
    documentDirectory,
    files,
    directories,
    async copy(from, to) {
      const content = files.get(from);
      if (content === undefined) throw new Error('Archivo de origen inexistente.');
      files.set(to, content);
    },
    async delete(uri) { files.delete(uri); },
    async exists(uri) { return files.has(uri) || directories.has(uri); },
    async makeDirectory(uri) { directories.add(uri); },
  };
}

test('fotos: copia la imagen temporal a photos/ con la extensión original', async () => {
  const files = memoryFiles();
  files.files.set('file:///tmp/captura.png', 'bytes-de-la-foto');
  const storage = createPhotoStorage(files);

  const uri = await storage.persist('file:///tmp/captura.png', 'tarea-1');

  assert.equal(uri, 'file:///docs/photos/tarea-1.png');
  assert.equal(files.files.get(uri), 'bytes-de-la-foto');
  assert.ok(files.directories.has('file:///docs/photos/'));
});

test('fotos: eliminar es tolerante a archivos inexistentes y sin almacenamiento falla', async () => {
  const files = memoryFiles();
  const storage = createPhotoStorage(files);

  await storage.remove('file:///docs/photos/no-existe.jpg');

  const unavailable = createPhotoStorage(memoryFiles(null));
  await assert.rejects(() => unavailable.persist('file:///tmp/a.jpg', 'tarea-2'));
});
