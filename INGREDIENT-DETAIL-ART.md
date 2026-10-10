# Фотографии ингредиентов — imagegen

Четыре новых прозрачных растровых атласа созданы встроенным imagegen. PNG сохранены в `work/ingredient-detail-20261010/art-source/` этой задачи. WebP экспортирован через cwebp с качеством 90 и сохранением альфа-канала. Скрипт Pillow только читает границы непрозрачных областей; фотографии не перерисовываются программно.

## Файлы

- `assets/builder-fillings-a-20261010.webp`: ID 1001–1009.
- `assets/builder-fillings-b-20261010.webp`: ID 1010–1018, включая коул-слоу 1016.
- `assets/builder-fillings-c-20261010.webp`: ID 1019–1027.
- `assets/builder-sauces-20261010.webp`: ID 1101–1116.
- `builder-photo-manifest.js`: точное соответствие ID → фото, размер исходника и границы альфа-канала.

Каждая позиция использует отдельную область фотографии. Неизвестная позиция не получает фотографию другого ингредиента. Для подписей и заказа используются названия и ID действующего каталога.

## Общий промпт начинок

Production sprite sheet for an interactive photorealistic burger/shawarma builder. Exactly three columns by three rows, nine equal square cells on a square canvas. One precise isolated food serving per cell, same mildly elevated front three-quarter camera, about 15 degrees looking downward, horizontally oriented, appropriate for an individual filling layer in a burger. Photorealistic macro food photography, warm neutral natural kitchen lighting, accurate visible ingredient textures and organic edges. Objects entirely inside their own cells with transparent padding. Genuine transparent background; no plates, bowls, packaging, knives, utensils, people, text, labels, gridlines, whole burgers or mixed-in foods. No substitutions or reused photos. Distinct servings in exact row-major order. Broad horizontal servings, practical burger-filling size, high fidelity edges, no illustration or cartoon shading.

### Атлас A

Row 1: one grilled beef burger patty with char marks; sliced grilled chicken with white cut surfaces and browned edges; one broad flattened crispy breaded chicken steak.
Row 2: two long crispy chicken strips; dark lean beef bacon with thin fat streaks; ordinary crispy bacon visibly marbled with more fat.
Row 3: one fried egg with golden yolk and crisp whites; three golden rough falafel balls; one wide orange cheddar slice with a little drape.
Chicken steak and strips must be different. Both kinds of bacon must differ. Exactly nine servings, no extra foods.

### Атлас B

Row 1: crumbly ivory Dorblu blue cheese with blue-green veins; two overlapping juicy tomato slices; fresh cucumber slices with crisp pale centres and dark green peel.
Row 2: olive-green translucent pickled cucumber slices, distinct from fresh cucumber; one wide ruffled green lettuce leaf; a horizontal loose pile of finely shredded white cabbage, no large lettuce leaf.
Row 3: coleslaw salad, finely shredded white cabbage and orange carrot with visible creamy mayonnaise dressing; raw white onion rings; raw red onion rings with purple edges.
Coleslaw must unequivocally be creamy cabbage and carrot, not lettuce or plain cabbage. Exactly nine servings.

### Атлас C

Row 1: golden grilled onion slices with char marks; soft glossy deep amber-brown caramelized onion strands; recognizable browned sliced sauteed mushrooms.
Row 2: chopped stewed mushroom ragout in thick glossy sauce; green jalapeno rings with seeds; chunky diced tomato salsa with white onion and cilantro.
Row 3: fresh cilantro sprigs with unmistakable cilantro leaves; straight crisp golden French fries, not chicken strips; a small thin mound of fine tan truffle seasoning with tiny dried dark truffle flecks, not mushrooms or whole truffles.
Every serving must be distinct. Exactly nine servings.

## Промпт соусов

Transparent production photo sprite sheet of actual sauces for a burger assembly preview. Exactly four columns by four rows, sixteen equal cells on a square canvas. Each cell contains one isolated small horizontal serving of sauce as a low thick ribbon, drizzled wave or spreading smear ready to sit on a burger filling. Real macro food photography, accurate texture, gloss and imperfections, same gently elevated three-quarter front angle. Wide and low, centered with transparent padding. No bowls, bottles, plates, utensils, packaging, backgrounds, garnishes, text, labels, illustration or generic flat colored ovals. No duplicates or substitutions.

Row 1: creamy green jalapeno with pepper flecks; red chili with fine chili texture; glossy dark brown barbecue; intense glossy red sriracha.
Row 2: thick golden orange cheese; ivory blue cheese with blue cheese flecks; smooth pink cocktail; pureed orange-red roasted pepper.
Row 3: dark glossy hoisin; translucent sweet chili with seeds; white garlic with herb specks; silky smooth ivory cream.
Row 4: orange-red buffalo; smooth red ketchup; yellow mustard with seed flecks; low beige hummus smear with visible chickpea texture.
Exactly sixteen servings on transparent alpha, about 75% of each cell's width and under 30% of its height. No other food.
