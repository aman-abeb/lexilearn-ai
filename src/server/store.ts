import { mkdir, readFile, rename, writeFile, unlink } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import type { Material } from "../lib/contracts";
import { storedMaterialsSchema } from "../lib/validation";
import { SAMPLE_MATERIAL } from "./materials";

/** Local, single-process development store. Replace with per-user DB storage before deployment. */
export class MaterialStore {
  private writes: Promise<void> = Promise.resolve();

  constructor(private readonly filePath: string) {}

  private async readFile(): Promise<Material[]> {
    try {
      const raw = await readFile(this.filePath, "utf8");
      return storedMaterialsSchema.parse(JSON.parse(raw));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return [structuredClone(SAMPLE_MATERIAL)];
      }
      // Corrupt or inaccessible files must never be silently replaced.
      throw error;
    }
  }

  async list(): Promise<Material[]> {
    await this.writes;
    return this.readFile();
  }

  async find(id: string): Promise<Material | undefined> {
    return (await this.list()).find((material) => material.id === id);
  }

  add(material: Material): Promise<void> {
    const write = this.writes.then(async () => {
      const materials = await this.readFile();
      if (materials.length >= 100) throw new Error("MATERIAL_LIMIT_REACHED");
      await mkdir(dirname(this.filePath), { recursive: true });
      const temporaryFile = `${this.filePath}.${randomUUID()}.tmp`;
      try {
        await writeFile(temporaryFile, JSON.stringify([material, ...materials], null, 2), "utf8");
        await rename(temporaryFile, this.filePath);
      } finally {
        await unlink(temporaryFile).catch((error: NodeJS.ErrnoException) => {
          if (error.code !== "ENOENT") throw error;
        });
      }
    });
    // Keep later operations usable after one failed write while exposing that error to the caller.
    this.writes = write.catch(() => undefined);
    return write;
  }
}

const globalStore = globalThis as typeof globalThis & { lexilearnStore?: MaterialStore };
export const materialStore = globalStore.lexilearnStore ??= new MaterialStore(
  resolve(process.env.LEXILEARN_DATA_DIR ?? ".data", "materials.json"),
);
