-- Usage: aseprite -b --script-param src=<sprite.aseprite> --script-param out=src/imgs/stickers/<id>.png --script-param native=32 --script scripts/sticker.lua
-- Then run `bun scripts/sticker-data.ts` so saving the sticker gives the new art.
-- Turn a pixel sprite into a die-cut sticker: sample it at its native grid, add a white border
-- `border` native pixels wide and a soft shadow down-right, then scale to about `size` px.
-- params: src, out, native (grid width of the art), border (default 1), size (default 512)
local src = app.open(app.params.src)
local W, H = src.width, src.height
local img = Image(W, H, ColorMode.RGB); img:drawSprite(src, 1)
src:close()
local native = tonumber(app.params.native)
local step = W // native
local nh = H // step
local b = tonumber(app.params.border or "1")
local size = tonumber(app.params.size or "512")
local pc = app.pixelColor

local N, M = native + 2 * b + 1, nh + 2 * b + 1
local grid = {}
for y = 0, M - 1 do grid[y] = {} end
for y = 0, nh - 1 do for x = 0, native - 1 do
  local p = img:getPixel(x * step + step // 2, y * step + step // 2)
  if pc.rgbaA(p) > 40 then grid[y + b][x + b] = p end
end end
-- Drop tiny detached specks (sparkles): with a border they'd turn into white blobs.
local seen = {}
for y = 0, M - 1 do seen[y] = {} end
for y = 0, M - 1 do for x = 0, N - 1 do
  if grid[y][x] and not seen[y][x] then
    local stack, cells = { { x, y } }, {}
    seen[y][x] = true
    while #stack > 0 do
      local c = table.remove(stack)
      cells[#cells + 1] = c
      for _, d in ipairs({ { 1, 0 }, { -1, 0 }, { 0, 1 }, { 0, -1 }, { 1, 1 }, { -1, -1 }, { 1, -1 }, { -1, 1 } }) do
        local xx, yy = c[1] + d[1], c[2] + d[2]
        if yy >= 0 and yy < M and xx >= 0 and xx < N and grid[yy][xx] and not seen[yy][xx] then seen[yy][xx] = true; stack[#stack + 1] = { xx, yy } end
      end
    end
    if #cells < 8 then for _, c in ipairs(cells) do grid[c[2]][c[1]] = nil end end
  end
end end
local white = pc.rgba(255, 255, 255, 255)
local border = {}
for y = 0, M - 1 do border[y] = {} end
for y = 0, M - 1 do for x = 0, N - 1 do
  if not grid[y][x] then
    local hit = false
    for dy = -b, b do for dx = -b, b do
      local yy, xx = y + dy, x + dx
      if not hit and yy >= 0 and yy < M and xx >= 0 and xx < N and grid[yy][xx] and dx * dx + dy * dy <= b * b + b then hit = true end
    end end
    if hit then border[y][x] = white end
  end
end end
for y = 0, M - 1 do for x = 0, N - 1 do if border[y][x] then grid[y][x] = border[y][x] end end end
-- shadow: an empty cell whose up-left neighbour is part of the sticker
local shadow = pc.rgba(58, 42, 74, 70)
local shade = {}
for y = 1, M - 1 do for x = 1, N - 1 do
  if not grid[y][x] and grid[y - 1][x - 1] then shade[#shade + 1] = { x, y } end
end end
for _, s in ipairs(shade) do grid[s[2]][s[1]] = shadow end

local k = math.max(1, size // math.max(N, M))
local out = Image(N * k, M * k, ColorMode.RGB)
for y = 0, M - 1 do for x = 0, N - 1 do
  local p = grid[y][x]
  if p then for yy = 0, k - 1 do for xx = 0, k - 1 do out:drawPixel(x * k + xx, y * k + yy, p) end end end
end end
out:saveAs(app.params.out)
