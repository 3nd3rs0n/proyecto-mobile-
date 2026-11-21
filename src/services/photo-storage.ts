export interface FileGateway {
  /** Carpeta permanente de la app, terminada en "/". */
  readonly documentDirectory: string | null;
  copy(from: string, to: string): Promise<void>;
  delete(uri: string): Promise<void>;
  exists(uri: string): Promise<boolean>;
  makeDirectory(uri: string): Promise<void>;
}

export interface PhotoStorage {
  /** Copia la foto temporal a la carpeta permanente y devuelve la nueva dirección. */
  persist(tempUri: string, taskId: string): Promise<string>;
  /** Si el archivo ya no existe, no falla. */
  remove(uri: string): Promise<void>;
}

export function createPhotoStorage(files: FileGateway): PhotoStorage {
  const photosDirectory = () => {
    if (!files.documentDirectory) throw new Error('El almacenamiento de archivos no está disponible.');
    return `${files.documentDirectory}photos/`;
  };

  return {
    async persist(tempUri, taskId) {
      const directory = photosDirectory();
      await files.makeDirectory(directory);
      const extension = /\.[a-z0-9]+$/i.exec(tempUri)?.[0] ?? '.jpg';
      const target = `${directory}${taskId}${extension}`;
      await files.copy(tempUri, target);
      return target;
    },
    async remove(uri) {
      try {
        if (await files.exists(uri)) await files.delete(uri);
      } catch {
        // Un archivo ya eliminado o inaccesible no debe romper el flujo.
      }
    },
  };
}
