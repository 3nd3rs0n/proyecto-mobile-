export interface FileGateway {
  /** Carpeta permanente de la app, terminada en "/". */
  readonly documentDirectory: string;
  copy(from: string, to: string): Promise<void>;
  delete(uri: string): Promise<void>;
  exists(uri: string): Promise<boolean>;
}

export interface PhotoStorage {
  /** Copia la foto temporal a la carpeta permanente y devuelve la nueva dirección. */
  persist(tempUri: string, taskId: string): Promise<string>;
  /** Si el archivo ya no existe, no falla. */
  remove(uri: string): Promise<void>;
}
