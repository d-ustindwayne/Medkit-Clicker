// Turns the game's pixel sprites into voxel sets: each art pixel becomes a cube, extruded a few layers deep.

export type VoxelSet = {
  /** World positions, xyz per voxel, centred on the origin. */
  positions: Float32Array;
  /** sRGB colours, 0-1, rgb per voxel. */
  colors: Float32Array;
  count: number;
  /** World size of one cube. */
  unit: number;
};

export type SpriteSpec = {
  url: string;
  /** Art pixels per side (32 for items, 64 for characters). */
  grid: number;
  /** Layers of cubes front to back. */
  depth: number;
};

/** Every set is scaled so its larger side is this many world units. */
export const SHAPE_SIZE = 10;

const loadImage = async (url: string) => {
  const img = new Image();
  img.src = url;
  await img.decode();
  return img;
};

export async function spriteToVoxels({ url, grid, depth }: SpriteSpec): Promise<VoxelSet> {
  const img = await loadImage(url);
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const cell = canvas.width / grid;

  // Sample the centre of every art pixel.
  const filled: (number[] | null)[] = new Array(grid * grid).fill(null);
  let minX = grid, maxX = 0, minY = grid, maxY = 0;
  for (let y = 0; y < grid; y++) {
    for (let x = 0; x < grid; x++) {
      const i = (Math.floor(y * cell + cell / 2) * canvas.width + Math.floor(x * cell + cell / 2)) * 4;
      if (data[i + 3] < 128) continue;
      filled[y * grid + x] = [data[i] / 255, data[i + 1] / 255, data[i + 2] / 255];
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }
  }

  const unit = SHAPE_SIZE / Math.max(maxX - minX + 1, maxY - minY + 1);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= grid || y >= grid ? null : filled[y * grid + x]);

  const pos: number[] = [];
  const col: number[] = [];
  // Top rows first, so cubes keep their rough height when one sprite rebuilds into the next.
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const c = at(x, y);
      if (!c) continue;
      const edge = !at(x - 1, y) || !at(x + 1, y) || !at(x, y - 1) || !at(x, y + 1);
      for (let z = 0; z < depth; z++) {
        // Inner layers only need their outline; the rest is hidden behind the front and back.
        if (z !== 0 && z !== depth - 1 && !edge) continue;
        pos.push((x - cx) * unit, (cy - y) * unit, ((depth - 1) / 2 - z) * unit);
        col.push(c[0], c[1], c[2]);
      }
    }
  }

  return { positions: new Float32Array(pos), colors: new Float32Array(col), count: pos.length / 3, unit };
}
