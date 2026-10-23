-- Builds the side extensions of each My Room room: 80x240 art on the left and right, shown when
-- the room is zoomed out while decorating (and panned to). Everything comes from the room's own art:
-- the wall, ceiling and floor carry on from its edge (their repeating pattern is measured with the
-- furniture left out), and each side gets a couple of the room's own fixtures copied onto it.
-- Usage: aseprite -b --script-param root=<repo> --script scripts/room-sides.lua
-- Add --script-param out=<folder> to write preview PNGs there instead (nothing in the repo changes).
local root = app.params.root
local out = app.params.out
local W, H, EXT, SCALE = 320, 240, 80, 4

-- Where furniture and signs are (art pixels, from the rooms' `blocked` areas), left out when
-- measuring the wall and floor; and what each side gets: {src x0, y0, x1, y1, dest x, dest y}.
local ROOMS = {
  { id = "empty", file = "room_empty",
    skip = { { 19, 70, 54, 149 }, { 230, 57, 298, 111 } },
    left = { { 19, 70, 55, 149, 24, 70 } },   -- another door
    right = { { 230, 57, 298, 112, 6, 57 } } }, -- another window
  { id = "reception", file = "hospital_inside",
    skip = { { 16, 0, 90, 68 }, { 0, 109, 109, 182 }, { 138, 50, 186, 61 }, { 128, 61, 195, 149 }, { 106, 70, 125, 106 }, { 198, 46, 214, 62 },
             { 198, 66, 240, 111 }, { 240, 66, 256, 91 }, { 256, 0, 320, 111 }, { 253, 111, 320, 180 }, { 182, 112, 246, 150 } },
    -- Crowded: the lower wall (its mint rail) is read from the clean strip by the corridor.
    sample = { 100, 147, 123, 129 },
    -- Its tiles have slanted grout lines that fan out from the middle; they carry on into the sides.
    fan = true,
    -- The ward curtain (and its rail) runs off the right edge; the side finishes it.
    curtain = { rail = 47, top = 48, bottom = 125, x0 = 300, period = 5, extra = 10 },
    left = { { 199, 128, 247, 151, 18, 128 } },  -- waiting chairs
    right = { { 106, 70, 125, 106, 14, 70 }, { 198, 44, 214, 63, 50, 52 } } }, -- framed pictures and a clock
  { id = "lab", file = "room_lab",
    skip = { { 38, 55, 93, 86 }, { 106, 53, 144, 95 }, { 150, 95, 314, 149 } },
    left = { { 106, 53, 145, 96, 22, 53 } },   -- a window
    right = { { 162, 95, 226, 149, 8, 95 } } }, -- more counter
  { id = "pharmacy", file = "room_pharmacy",
    skip = { { 10, 52, 112, 120 }, { 208, 52, 310, 120 }, { 144, 53, 179, 98 } },
    -- A narrower shelf from both ends of a real one, so its frame is whole.
    left = { { 10, 52, 40, 121, 10, 52 }, { 82, 52, 112, 121, 40, 52 } },
    right = { { 208, 52, 238, 121, 10, 52 }, { 280, 52, 310, 121, 40, 52 } } },
  { id = "kids", file = "room_kids",
    skip = { { 0, 50, 215, 145 }, { 243, 55, 310, 113 } },
    left = { { 243, 55, 311, 114, 6, 55 } },   -- a window
    right = { { 14, 54, 52, 76, 10, 60 }, { 88, 50, 100, 62, 56, 46 }, { 88, 50, 100, 62, 44, 100 } } }, -- a cloud and stars
}

local function inside(x, y, rects)
  for _, r in ipairs(rects) do
    if x >= r[1] and x < r[3] and y >= r[2] and y < r[4] then return true end
  end
  return false
end

-- The repeat width of a band of rows (1 for a plain colour), from its clean pixels.
local function period(img, y0, y1, skip)
  local best, bestScore = 1, -1
  for p = 1, 64 do
    local same, total = 0, 0
    for y = y0, y1 do
      for x = 0, W - 1 - p do
        if not inside(x, y, skip) and not inside(x + p, y, skip) then
          total = total + 1
          if img:getPixel(x, y) == img:getPixel(x + p, y) then same = same + 1 end
        end
      end
    end
    local score = total > 0 and same / total or 0
    -- Prefer the shortest repeat that matches almost everywhere.
    if score >= 0.985 then return p end
    if score > bestScore + 0.002 then best, bestScore = p, score end
  end
  return best
end

-- The usual pixel at row y for each position in the repeat (furniture voted out).
local function rowPattern(img, y, p, skip)
  local out = {}
  for phase = 0, p - 1 do
    local counts, top, topN = {}, nil, 0
    for x = phase, W - 1, p do
      if not inside(x, y, skip) then
        local c = img:getPixel(x, y)
        counts[c] = (counts[c] or 0) + 1
        if counts[c] > topN then top, topN = c, counts[c] end
      end
    end
    out[phase] = top or img:getPixel(phase, y)
  end
  return out
end

local LINE = Color { r = 0xcb, g = 0xd4, b = 0xdf }.rgbaPixel
local SHINE = Color { r = 0xee, g = 0xf2, b = 0xf7 }.rgbaPixel
local FLOOR_TOP = 149

-- The grid in one floor row: where its grout lines cross (art x), as a centre line and a spacing,
-- fitted to the lines found across the whole room. Nil for a full grout row, a dotted row, or a row
-- with too few lines showing.
local function rowGrid(img, y)
  local xs, on = {}, false
  for x = 0, W - 1 do
    local l = img:getPixel(x, y) == LINE
    if l and not on then table.insert(xs, x) end
    on = l
  end
  if #xs < 3 or #xs > 14 then return nil end
  -- The usual gap between neighbouring lines, then each line's number counted from the one nearest
  -- the middle, and a straight-line fit through them.
  local gaps = {}
  for i = 2, #xs do table.insert(gaps, xs[i] - xs[i - 1]) end
  table.sort(gaps)
  local gap = gaps[math.floor((#gaps + 1) / 2)]
  if gap < 12 then return nil end
  local mid = xs[1]
  for _, x in ipairs(xs) do
    if math.abs(x - W / 2) < math.abs(mid - W / 2) then mid = x end
  end
  local n, si, sx, sii, six = 0, 0, 0, 0, 0
  for _, x in ipairs(xs) do
    local i = math.floor((x - mid) / gap + 0.5)
    n, si, sx, sii, six = n + 1, si + i, sx + x, sii + i * i, six + i * x
  end
  local d = n * sii - si * si
  if d == 0 then return nil end
  local s = (n * six - si * sx) / d
  return { c = (sx - s * si) / n, s = s }
end

-- Carries the floor's perspective grid on into the side: every floor row's grout lines continue
-- at that row's own spacing, so the lines run on unbroken from the room and keep fanning out.
-- Rows that can't be measured borrow the nearest row's grid.
local function drawFan(img, ext, side)
  -- Measure every row, keeping the same line as the centre all the way down (a row's own fit may
  -- have picked its neighbour), then fit the centre and the spacing down the floor.
  local ys, cs, ss, last = {}, {}, {}, nil
  for y = FLOOR_TOP, H - 1 do
    local g = rowGrid(img, y)
    if g then
      local c = g.c
      if last then c = c + math.floor((last - c) / g.s + 0.5) * g.s end
      last = c
      table.insert(ys, y); table.insert(cs, c); table.insert(ss, g.s)
    end
  end
  if #ys < 6 then return end
  -- Straight-line fits (v = a + b*y): in a true perspective grid both change evenly down the floor,
  -- which keeps every line straight.
  local function line(vs)
    local n, sy, sv, syy, syv = #ys, 0, 0, 0, 0
    for k = 1, n do
      sy, sv, syy, syv = sy + ys[k], sv + vs[k], syy + ys[k] * ys[k], syv + ys[k] * vs[k]
    end
    local b = (n * syv - sy * sv) / (n * syy - sy * sy)
    local a = (sv - b * sy) / n
    return function(y) return a + b * y end
  end
  local cAt, sAt = line(cs), line(ss)
  local smooth = {}
  for y = FLOOR_TOP, H - 1 do smooth[y] = { c = cAt(y), s = sAt(y) } end
  -- Full grout rows stay as they are (the side's band pattern already has them).
  local function fullRow(y)
    for x = 0, W - 1, 7 do
      if img:getPixel(x, y) ~= LINE then return false end
    end
    return true
  end
  local prev = {}
  for y = FLOOR_TOP, H - 1 do
    local g = smooth[y]
    if g and not fullRow(y) then
      local now = {}
      for i = -12, 12 do
        local vx = math.floor(g.c + i * g.s + 0.5)
        local sx = side == "left" and (vx + EXT) or (vx - W)
        now[i] = sx
        -- Join to where this line was on the row above, so steep lines stay unbroken.
        local from = prev[i] or sx
        for x = math.min(from, sx), math.max(from, sx) do
          if x >= 0 and x < EXT then ext:drawPixel(x, y, LINE) end
        end
      end
      prev = now
    else
      prev = {}
    end
  end
end

-- A ceiling light cut by the room's right edge gets its other end.
local function finishLight(img, ext, light)
  local x = W - 1
  while x > W - 40 and img:getPixel(x, 5) ~= img:getPixel(0, 1) do x = x - 1 end
  local start = x + 1
  if start >= W then return end
  for i = 0, 33 - (W - start) do
    for y = 0, 13 do ext:drawPixel(i, y, img:getPixel(light + (W - start) + i, y)) end
  end
end

-- The curtain carries on for a couple of pleats and closes with a fold; its rail ends in a cap.
local function finishCurtain(img, ext, c)
  local dark = img:getPixel(c.x0, c.top + 2)
  for y = c.top, c.bottom + 1 do
    for x = 0, c.extra do
      local px = img:getPixel(c.x0 + (W + x - c.x0) % c.period, math.min(y, c.bottom))
      if x == c.extra or y == c.bottom + 1 then px = dark end
      ext:drawPixel(x, y, px)
    end
  end
  local rail = img:getPixel(W - 1, c.rail)
  for x = 0, c.extra + 2 do ext:drawPixel(x, c.rail, rail) end
  for y = c.rail - 1, c.rail + 1 do ext:drawPixel(c.extra + 2, y, rail) end
end

local function build(img, room, side)
  local ext = Image(EXT, H, ColorMode.RGB)
  -- Bands: ceiling (0-13), wall (14-147), floor (148-239); each repeats on its own.
  for _, band in ipairs({ { 0, 13 }, { 14, 147 }, { 148, H - 1 } }) do
    local p = period(img, band[1], band[2], room.skip)
    for y = band[1], band[2] do
      local pat = rowPattern(img, y, p, room.skip)
      local s = room.sample
      if s and y >= s[1] and y <= s[2] then
        -- One colour per row, read from the room's clean sample strip.
        local counts, top, topN = {}, nil, 0
        for sx = s[3], s[4] - 1 do
          local c = img:getPixel(sx, y)
          counts[c] = (counts[c] or 0) + 1
          if counts[c] > topN then top, topN = c, counts[c] end
        end
        pat = {}
        for phase = 0, p - 1 do pat[phase] = top end
      end
      for x = 0, EXT - 1 do
        -- Phase lined up with the room's own columns, so the seam at its edge doesn't show.
        local virtual = side == "left" and (x - EXT) or (W + x)
        ext:drawPixel(x, y, pat[virtual % p])
      end
    end
  end
  -- A ceiling light in the middle, like the room's own.
  local light = room.id == "reception" and 19 or 39
  for y = 0, 13 do
    for x = 0, 33 do ext:drawPixel(23 + x, y, img:getPixel(light + x, y)) end
  end
  if side == "right" then finishLight(img, ext, light) end
  if room.fan then drawFan(img, ext, side) end
  if room.curtain and side == "right" then finishCurtain(img, ext, room.curtain) end
  for _, c in ipairs(room[side]) do
    for y = c[2], c[4] - 1 do
      for x = c[1], c[3] - 1 do
        local px = img:getPixel(x, y)
        if app.pixelColor.rgbaA(px) > 0 then ext:drawPixel(c[5] + x - c[1], c[6] + y - c[2], px) end
      end
    end
  end
  return ext
end

for _, room in ipairs(ROOMS) do
  local src = app.open(root .. "/src/media/photos/sprites/scenes/" .. room.file .. ".aseprite")
  local img = Image(W, H, ColorMode.RGB)
  img:drawSprite(src, 1)
  src:close()
  for _, side in ipairs({ "left", "right" }) do
    local ext = build(img, room, side)
    local name = "room_" .. room.id .. "_" .. side
    local spr = Sprite(EXT, H, ColorMode.RGB)
    spr.cels[1].image = ext
    if not out then spr:saveAs(root .. "/src/media/photos/sprites/scenes/" .. name .. ".aseprite") end
    app.command.SpriteSize { width = EXT * SCALE, height = H * SCALE, method = "nearest" }
    spr:saveCopyAs((out or (root .. "/src/imgs/scenes")) .. "/" .. name .. ".png")
    spr:close()
  end
end
