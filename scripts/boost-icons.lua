-- Builds the 13 boost icons: src/media/photos/sprites/boosts/*.aseprite (32x32) and src/imgs/boosts/*.png (1024).
-- Run: aseprite -b --script-param src=<repo>/src/media/photos/sprites/ --script-param out=<repo>/src/imgs/boosts/ --script scripts/boost-icons.lua
local src = app.params.src      -- src/media/photos/sprites/
local out = app.params.out      -- src/imgs/boosts/
local GLYPH = {
  bolt =    { "...#.", "..#..", ".###.", "..#..", ".#..." },
  plus =    { "..#..", "..#..", "#####", "..#..", "..#.." },
  up =      { "..#..", ".###.", "#.#.#", "..#..", "..#.." },
  star =    { "..#..", ".###.", "#####", ".###.", ".#.#." },
  percent = { "##..#", "##.#.", "..#..", ".#.##", "#..##" },
}
-- badge fill, border (darker shade of the fill), glyph colour
local KIND = {
  instant = { Color{r=221,g=17,b=34}, Color{r=140,g=10,b=24}, Color{r=255,g=255,b=255} },
  tap     = { Color{r=240,g=138,b=36}, Color{r=168,g=86,b=14}, Color{r=255,g=255,b=255}, "bolt" },
  rate    = { Color{r=47,g=127,b=224}, Color{r=24,g=74,b=150}, Color{r=255,g=255,b=255}, "up" },
  sale    = { Color{r=224,g=69,b=154}, Color{r=150,g=34,b=98}, Color{r=255,g=255,b=255}, "percent" },
  lucky   = { Color{r=47,g=158,b=79}, Color{r=22,g=96,b=44}, Color{r=255,g=255,b=255}, "star" },
}
KIND.instant[4] = "plus"
local ICONS = {
  { "emergency_funding", "misc/coin", 75, "instant" },
  { "adrenaline", "shop/syringe", 270, "tap" },
  { "patient_rush", "misc/heart", 320, "instant" },
  { "double_shift", "achievements/clock_moon", 180, "rate" },
  { "code_blue", "achievements/winged_heart", 220, "tap" },
  { "lucky_stethoscope", "shop/stethoscope", 195, "lucky" },
  { "clearance_sale", "misc/bandage", 150, "sale" },
  { "research_grant", "achievements/medal", 260, "instant" },
  { "flu_season", "shop/thermometer", 120, "rate" },
  { "triple_espresso", "achievements/night_coffee", 25, "tap" },
  { "night_crew", "achievements/light_off", 180, "rate" },
  { "charity_gala", "achievements/trophy_star", 300, "instant" },
  { "time_warp", "achievements/clock_moon", 100, "instant", true },
}
-- Built-in sparkles in the source sprites, removed (x, y, w, h).
local ERASE = {
  charity_gala = { { 5, 0, 3, 3 } },
  triple_espresso = { { 4, 4, 1, 1 }, { 18, 3, 1, 1 }, { 29, 12, 1, 1 } },
}
local pc = app.pixelColor
for _, icon in ipairs(ICONS) do
  local id, from, shift, kind, flip = icon[1], icon[2], icon[3], icon[4], icon[5]
  local s = app.open(src .. from .. ".aseprite")
  if flip then app.command.Flip{ target = "canvas", orientation = "horizontal" } end
  local img = s.cels[1].image:clone()
  local pos = s.cels[1].position
  local full = Image(32, 32, ColorMode.RGB)
  full:drawImage(img, pos)
  for it in full:pixels() do
    local v = it()
    local a = pc.rgbaA(v)
    if a > 0 then
      local c = Color{ r = pc.rgbaR(v), g = pc.rgbaG(v), b = pc.rgbaB(v), a = a }
      if c.hsvSaturation > 0.12 then
        c.hsvHue = (c.hsvHue + shift) % 360
        it(pc.rgba(c.red, c.green, c.blue, a))
      end
    end
  end
  for _, r in ipairs(ERASE[id] or {}) do
    for y = r[2], r[2] + r[4] - 1 do
      for x = r[1], r[1] + r[3] - 1 do full:drawPixel(x, y, pc.rgba(0, 0, 0, 0)) end
    end
  end
  -- Badge: 9x9 with clipped corners in the bottom-right.
  local k = KIND[kind]
  local x0, y0 = 23, 23
  for y = 0, 8 do
    for x = 0, 8 do
      local corner = (x == 0 or x == 8) and (y == 0 or y == 8)
      if not corner then
        local edge = x == 0 or x == 8 or y == 0 or y == 8
        local col = edge and k[2] or k[1]
        full:drawPixel(x0 + x, y0 + y, pc.rgba(col.red, col.green, col.blue, 255))
      end
    end
  end
  local g = GLYPH[k[4]]
  for y = 1, 5 do
    for x = 1, 5 do
      if g[y]:sub(x, x) == "#" then full:drawPixel(x0 + 1 + x, y0 + 1 + y, pc.rgba(k[3].red, k[3].green, k[3].blue, 255)) end
    end
  end
  s.cels[1].image = full
  s.cels[1].position = Point(0, 0)
  s:saveAs(src .. "boosts/" .. id .. ".aseprite")
  app.command.SpriteSize{ ui = false, width = 1024, height = 1024, method = "nearest" }
  s:saveCopyAs(out .. id .. ".png")
  s:close()
  print(id)
end
