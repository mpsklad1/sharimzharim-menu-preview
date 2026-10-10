# Фотографии конструктора

Использован встроенный инструмент imagegen. WebP экспортирован через cwebp с качеством 88; прозрачность сохранена. Кадрирование отдельных элементов выполняется CSS, исходные изображения не перерисованы программно.

## Файлы в проекте

- `assets/saladbar-trays-20261010.webp` — фотография одобренного большого салат-бара; используются фотографии всех 27 начинок с прежним ракурсом.
- `assets/saladbar-bottle-atlas-20261010.webp` — 16 бутылок на прозрачном фоне.
- `assets/saladbar-food-layers-20261010.webp` — 16 фотографических слоёв для сборки блюда на прозрачном фоне.

Подписи, переключатели, выбранный состав и цена — настоящий HTML. Макет целиком не используется как неактивная картинка интерфейса. Предпросмотр блюда иллюстрирует типы выбранных начинок; полный точный перечень отображается в составе и сохраняется на сервере.

Исходные PNG сохранены в рабочей папке `work/salad-bar-20261010/art-source/` текущей задачи.

## Промпт бутылок

Production asset sheet for the #ШаримЖарим restaurant interactive salad bar. A perfectly uniform 4 column by 4 row sprite sheet of sixteen realistic professional kitchen squeeze bottles on a genuine fully transparent background. One whole complete bottle per square cell, no overlaps, equal size, centered, generous transparent padding. Tall translucent food-safe plastic condiment squeeze bottles with conical dispensing nozzles and screw caps. Photorealism, warm food photography, slightly elevated front three-quarter camera angle, realistic highlights and subtle plastic imperfections. No text, labels, trays, environment, table, cartoon, cast-shadow rectangles or visible grid lines. Each bottle about half the cell width and 85% of the cell height, nozzle fully visible.

Exact row-major sauce order: green jalapeno, red chili, dark brown barbecue, red sriracha; orange-yellow cheese, ivory blue cheese with herb specks, pale pink cocktail, orange-red roasted pepper; dark hoisin, translucent sweet chili with seeds, white garlic with herbs, ivory cream; orange buffalo, red ketchup, yellow mustard, beige hummus with a broad nozzle. Only sixteen bottles. Square canvas, equal square cells, fully isolated clean alpha edges.

## Промпт слоёв блюда

A production sprite sheet of realistic food layers for an interactive burger and shawarma builder. Genuine transparent background. Exactly four columns by four rows, sixteen equal square cells. One isolated hyperrealistic food item in each cell, same shallow elevated three-quarter front view suitable for stacking a real burger. Warm commercial food photography, juicy macro textures, organic imperfections. Objects completely within cells with transparent padding, centered, no text, labels, gridlines, utensils, plates, environment or shadow rectangles. Comparable scales, width about 75% of cell; horizontal, thinner layers for software stacking.

Exact row-major order: golden sesame top bun, bottom bun interior facing up, grilled beef patty, draped orange cheddar slice; overlapping tomato slices, broad ruffled lettuce leaf, white onion rings, crisp beef bacon strips; pickled cucumber slices, fried egg with golden yolk, sauteed mushrooms, grilled chicken slices; crispy chicken strips, three falafel balls, toasted lavash folded into an open boat, toasted empty pita pocket cut open. Square canvas, clean alpha edges, no logos or watermarks.

## Основа фотографий салат-бара

Прежний одобренный макет: большой салат-бар в тёплом тёмном ресторане, нержавеющие гастроёмкости с 27 начинками из действующего меню и соседняя станция 16 соусов, камеры сверху под углом. Названия и состав зафиксированы в `deploy/saladbar-20261010/catalog.json`. В приложении соусы заменены бутылками отдельного атласа, ёмкости увеличены и занимают ширину каждой строки. Пустой металлический участок макета не переносится в интерфейс.
