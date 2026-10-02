# Спрайты «Шарим-Жарим»

Сгенерировано 2026-10-02 через шлюз sub2api (https://code.wbbaza.com/v1/images/generations).

- Модель: `gpt-image-2` (шлюз отвечает `gpt-image-2-codex`), `background=transparent`, `output_format=png`, запрошено 1024x1024 / quality high — шлюз отдал 1254x1254, quality auto.
- Ключ: LIBRECHAT-IMAGES (№37, `sk-c2c…`), из `IMAGE_GEN_OAI_API_KEY` в /opt/librechat/.env на stiralki.
- Постобработка (Pillow): обрезка по альфе, квадрат с полем 4 %, ресайз до 512x512 LANCZOS. Фон — родная прозрачность модели, хромакей не понадобился.
- Все 5 картинок приняты с первой попытки. Кириллица на пакете вышла правильно: «ШАРИМ-ЖАРИМ».

## Общий стиль (добавлялся в конец каждого промта)

```
Style: bright flat cartoon game sticker, bold saturated colors, simple cel shading, very thick dark outline (#1a1a1a) around the whole object, clean vector-like look, single centered object filling most of the square 1:1 frame, fully transparent background, no shadow on ground, no extra objects.
```

## Промты

### shawarma.png

```
An appetizing shawarma wrapped in lavash flatbread, shown 3/4 side view, partly unwrapped at the top showing grilled meat, fresh vegetables, tomato, cucumber and white garlic sauce, wrapped in a paper wrap at the bottom. No text.
```

### burger.png

```
A juicy burger with sesame bun, beef patty, melted cheese, lettuce and tomato, 3/4 side view. No text.
```

### slipper.png

```
An old worn-out ugly house slipper, faded and dirty, with a hole and a frayed sole, side 3/4 view, comically gross (a bad item in a food-catching game). No text.
```

### bone.png

```
A gnawed, chewed bone with bits of cartilage, off-white with dirty spots, lying diagonally, side 3/4 view (a bad item in a food-catching game). No text.
```

### bag.png

```
A kraft brown paper food takeaway bag, open at the top, front view, upright, empty top opening visible. On the front of the bag big bold black (#0A0A0A) Cyrillic capital letters exactly reading "ШАРИМ-ЖАРИМ" (Russian, spelled Ш-А-Р-И-М-hyphen-Ж-А-Р-И-М), with a lime (#E8FF5C) accent stripe or highlight behind the text. No other text.
```

