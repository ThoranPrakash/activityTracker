// Food database. Values are per 100 g (or 100 ml for drinks), approximate,
// for typical home-style Indian preparation. Each row:
// [name, category, kcal, protein, carbs, fat, servingGrams, servingLabel, tag]
// tag: 'p' = protein-rich, 'w' = whole food, 'j' = junk / fried / sweet

const RAW = [
  // ── Breakfast ──
  ['Idli', 'Breakfast', 145, 4.5, 30, 0.4, 40, '1 idli', 'w'],
  ['Plain dosa', 'Breakfast', 168, 3.9, 29, 3.7, 80, '1 dosa', 'w'],
  ['Masala dosa', 'Breakfast', 180, 3.5, 27, 6.5, 150, '1 masala dosa', 'w'],
  ['Rava dosa', 'Breakfast', 200, 4, 28, 8, 100, '1 dosa', 'w'],
  ['Onion uttapam', 'Breakfast', 160, 4, 26, 4.5, 120, '1 uttapam', 'w'],
  ['Pesarattu', 'Breakfast', 150, 8, 22, 3.5, 100, '1 pesarattu', 'p'],
  ['Upma', 'Breakfast', 150, 3.5, 22, 5.5, 200, '1 bowl', 'w'],
  ['Poha', 'Breakfast', 130, 2.6, 23, 3.5, 200, '1 bowl', 'w'],
  ['Ven pongal', 'Breakfast', 160, 4.5, 22, 6, 200, '1 bowl', 'w'],
  ['Medu vada', 'Breakfast', 290, 9, 28, 16, 50, '1 vada', 'j'],
  ['Puri', 'Breakfast', 350, 6, 42, 17, 30, '1 puri', 'j'],
  ['Aloo paratha', 'Breakfast', 260, 5.5, 35, 11, 120, '1 paratha', 'w'],
  ['Plain paratha', 'Breakfast', 300, 7, 42, 12, 80, '1 paratha', 'w'],
  ['Sambar', 'Breakfast', 70, 3.3, 9, 2.2, 150, '1 cup', 'w'],
  ['Coconut chutney', 'Breakfast', 230, 3, 9, 21, 30, '2 tbsp', 'w'],
  ['Tomato / onion chutney', 'Breakfast', 90, 1.5, 9, 5.5, 30, '2 tbsp', 'w'],
  ['White bread', 'Breakfast', 265, 9, 49, 3.2, 25, '1 slice', 'w'],
  ['Brown / whole wheat bread', 'Breakfast', 250, 10, 43, 4, 28, '1 slice', 'w'],
  ['Oats (dry)', 'Breakfast', 389, 16.9, 66, 6.9, 40, '½ cup dry', 'w'],
  ['Muesli', 'Breakfast', 370, 10, 66, 6, 45, '1 bowl', 'w'],
  ['Cornflakes', 'Breakfast', 357, 7.5, 84, 0.4, 30, '1 bowl', 'w'],
  ['Peanut butter', 'Breakfast', 588, 25, 20, 50, 16, '1 tbsp', 'w'],
  ['Butter', 'Breakfast', 717, 0.9, 0.1, 81, 10, '2 tsp', 'w'],
  ['Jam', 'Breakfast', 250, 0.4, 65, 0.1, 20, '1 tbsp', 'j'],

  // ── Eggs ──
  ['Boiled egg', 'Eggs', 155, 13, 1.1, 11, 50, '1 egg', 'p'],
  ['Egg white (boiled)', 'Eggs', 52, 11, 0.7, 0.2, 33, '1 white', 'p'],
  ['Omelette', 'Eggs', 154, 11, 1, 12, 120, '2-egg omelette', 'p'],
  ['Egg bhurji', 'Eggs', 180, 11, 3, 14, 120, '1 plate (2 eggs)', 'p'],
  ['Egg curry', 'Eggs', 150, 8, 5, 11, 200, '1 bowl (2 eggs)', 'p'],
  ['Half fry / fried egg', 'Eggs', 196, 13.6, 0.8, 15, 50, '1 egg', 'p'],

  // ── Rice & grains ──
  ['White rice (cooked)', 'Rice & roti', 130, 2.7, 28, 0.3, 150, '1 cup', 'w'],
  ['Brown rice (cooked)', 'Rice & roti', 112, 2.6, 23, 0.9, 150, '1 cup', 'w'],
  ['Curd rice', 'Rice & roti', 140, 3.5, 20, 5, 200, '1 bowl', 'w'],
  ['Lemon rice', 'Rice & roti', 170, 3, 28, 5, 200, '1 bowl', 'w'],
  ['Jeera rice', 'Rice & roti', 160, 3, 28, 4, 150, '1 cup', 'w'],
  ['Veg pulao', 'Rice & roti', 150, 3, 25, 4.5, 200, '1 bowl', 'w'],
  ['Chapati', 'Rice & roti', 297, 9, 50, 7, 40, '1 chapati', 'w'],
  ['Phulka (no oil)', 'Rice & roti', 260, 9, 52, 1.5, 30, '1 phulka', 'w'],
  ['Naan', 'Rice & roti', 290, 9, 50, 5.5, 90, '1 naan', 'w'],
  ['Butter naan', 'Rice & roti', 330, 8.5, 50, 10.5, 100, '1 naan', 'j'],
  ['Ragi mudde', 'Rice & roti', 115, 2.5, 25, 0.5, 150, '1 ball', 'w'],
  ['Quinoa (cooked)', 'Rice & roti', 120, 4.4, 21, 1.9, 150, '1 cup', 'w'],
  ['Chicken biryani', 'Rice & roti', 180, 9, 22, 6.5, 300, '1 plate', 'w'],
  ['Mutton biryani', 'Rice & roti', 200, 9, 21, 9, 300, '1 plate', 'w'],
  ['Egg biryani', 'Rice & roti', 170, 7, 23, 6, 300, '1 plate', 'w'],
  ['Veg biryani', 'Rice & roti', 150, 3.5, 24, 4.5, 300, '1 plate', 'w'],
  ['Chicken fried rice', 'Rice & roti', 170, 7, 24, 5, 250, '1 plate', 'j'],
  ['Hakka noodles', 'Rice & roti', 170, 4.5, 25, 6, 250, '1 plate', 'j'],
  ['Instant noodles (dry wt)', 'Rice & roti', 440, 9, 60, 18, 70, '1 packet', 'j'],

  // ── Dal & veg ──
  ['Dal (plain, cooked)', 'Dal & veg', 120, 6.8, 16, 3, 150, '1 bowl', 'w'],
  ['Dal tadka', 'Dal & veg', 130, 6, 15, 5, 150, '1 bowl', 'w'],
  ['Dal makhani', 'Dal & veg', 180, 7, 16, 10, 150, '1 bowl', 'w'],
  ['Rajma curry', 'Dal & veg', 140, 7, 18, 4.5, 150, '1 bowl', 'w'],
  ['Chole', 'Dal & veg', 160, 7.5, 20, 6, 150, '1 bowl', 'w'],
  ['Rasam', 'Dal & veg', 30, 1, 5, 0.8, 150, '1 cup', 'w'],
  ['Kootu', 'Dal & veg', 110, 5, 12, 4.5, 150, '1 bowl', 'w'],
  ['Mixed veg curry', 'Dal & veg', 100, 2.5, 9, 6, 150, '1 bowl', 'w'],
  ['Aloo sabzi', 'Dal & veg', 130, 2, 17, 6.5, 150, '1 bowl', 'w'],
  ['Bhindi fry', 'Dal & veg', 120, 2.5, 10, 8, 100, '1 serving', 'w'],
  ['Poriyal (beans / cabbage)', 'Dal & veg', 90, 2, 8, 5.5, 100, '1 serving', 'w'],
  ['Palak paneer', 'Dal & veg', 170, 8, 6, 13, 150, '1 bowl', 'p'],
  ['Paneer butter masala', 'Dal & veg', 250, 10, 9, 20, 150, '1 bowl', 'j'],
  ['Green salad', 'Dal & veg', 20, 1, 4, 0.2, 100, '1 bowl', 'w'],
  ['Sprouts salad', 'Dal & veg', 55, 4, 8, 0.5, 100, '1 bowl', 'p'],

  // ── Chicken ──
  ['Chicken breast (cooked)', 'Chicken', 165, 31, 0, 3.6, 100, '100 g', 'p'],
  ['Grilled chicken', 'Chicken', 180, 27, 1, 7.5, 150, '1 serving', 'p'],
  ['Chicken curry', 'Chicken', 150, 15, 4, 8.5, 200, '1 bowl', 'p'],
  ['Butter chicken', 'Chicken', 220, 14, 6, 16, 200, '1 bowl', 'j'],
  ['Chicken tikka', 'Chicken', 150, 24, 3, 5, 120, '4 pieces', 'p'],
  ['Tandoori chicken', 'Chicken', 150, 25, 3, 4.5, 200, '1 quarter', 'p'],
  ['Chicken seekh kebab', 'Chicken', 220, 17, 4, 15, 80, '2 kebabs', 'p'],
  ['Chicken 65', 'Chicken', 280, 20, 12, 17, 100, '1 plate (small)', 'j'],
  ['Fried chicken', 'Chicken', 290, 20, 10, 18, 150, '2 pieces', 'j'],
  ['Chicken shawarma roll', 'Chicken', 220, 12, 22, 10, 250, '1 roll', 'j'],
  ['Chicken sandwich', 'Chicken', 230, 13, 26, 8, 150, '1 sandwich', 'w'],
  ['Chicken soup', 'Chicken', 45, 5, 3, 1.5, 250, '1 bowl', 'p'],

  // ── Mutton & seafood ──
  ['Mutton curry', 'Mutton & fish', 200, 16, 4, 13, 200, '1 bowl', 'p'],
  ['Mutton keema', 'Mutton & fish', 230, 17, 4, 16, 150, '1 bowl', 'p'],
  ['Fish curry', 'Mutton & fish', 130, 15, 4, 6, 200, '1 bowl', 'p'],
  ['Fish fry', 'Mutton & fish', 230, 20, 8, 13, 100, '1 piece', 'p'],
  ['Grilled fish', 'Mutton & fish', 130, 24, 0, 3.5, 150, '1 fillet', 'p'],
  ['Prawn curry', 'Mutton & fish', 130, 15, 4, 6, 150, '1 bowl', 'p'],
  ['Prawn fry', 'Mutton & fish', 210, 20, 6, 12, 100, '1 serving', 'p'],
  ['Tuna (canned in water)', 'Mutton & fish', 116, 26, 0, 1, 100, '1 can (drained)', 'p'],
  ['Salmon', 'Mutton & fish', 208, 20, 0, 13, 150, '1 fillet', 'p'],

  // ── Dairy & protein ──
  ['Milk (toned)', 'Dairy & protein', 58, 3.2, 4.7, 3, 250, '1 glass (250 ml)', 'w'],
  ['Milk (full cream)', 'Dairy & protein', 66, 3.3, 4.8, 3.7, 250, '1 glass (250 ml)', 'w'],
  ['Curd / dahi', 'Dairy & protein', 60, 3.5, 4.5, 3, 150, '1 cup', 'w'],
  ['Greek yogurt', 'Dairy & protein', 60, 10, 3.6, 0.4, 150, '1 cup', 'p'],
  ['Buttermilk', 'Dairy & protein', 25, 1.5, 2.5, 0.8, 250, '1 glass', 'w'],
  ['Paneer', 'Dairy & protein', 265, 18, 1.2, 21, 100, '100 g', 'p'],
  ['Cheese slice', 'Dairy & protein', 310, 18, 6, 24, 20, '1 slice', 'w'],
  ['Whey protein', 'Dairy & protein', 400, 78, 8, 6, 32, '1 scoop', 'p'],
  ['Tofu', 'Dairy & protein', 76, 8, 1.9, 4.8, 100, '100 g', 'p'],
  ['Soya chunks (dry)', 'Dairy & protein', 345, 52, 33, 0.5, 30, '30 g dry', 'p'],
  ['Protein bar', 'Dairy & protein', 370, 30, 40, 11, 60, '1 bar', 'p'],

  // ── Fruits ──
  ['Banana', 'Fruits', 89, 1.1, 23, 0.3, 120, '1 banana', 'w'],
  ['Apple', 'Fruits', 52, 0.3, 14, 0.2, 180, '1 apple', 'w'],
  ['Orange', 'Fruits', 47, 0.9, 12, 0.1, 150, '1 orange', 'w'],
  ['Papaya', 'Fruits', 43, 0.5, 11, 0.3, 150, '1 cup', 'w'],
  ['Mango', 'Fruits', 60, 0.8, 15, 0.4, 200, '1 mango', 'w'],
  ['Watermelon', 'Fruits', 30, 0.6, 7.6, 0.2, 250, '1 bowl', 'w'],
  ['Guava', 'Fruits', 68, 2.6, 14, 1, 100, '1 guava', 'w'],
  ['Grapes', 'Fruits', 69, 0.7, 18, 0.2, 100, '1 cup', 'w'],
  ['Pomegranate', 'Fruits', 83, 1.7, 19, 1.2, 150, '1 cup seeds', 'w'],
  ['Pineapple', 'Fruits', 50, 0.5, 13, 0.1, 150, '1 cup', 'w'],
  ['Chikoo', 'Fruits', 83, 0.4, 20, 1.1, 100, '1 chikoo', 'w'],
  ['Dates', 'Fruits', 280, 2.5, 75, 0.4, 8, '1 date', 'w'],

  // ── Nuts & healthy snacks ──
  ['Almonds', 'Nuts & snacks', 579, 21, 22, 50, 10, '~8 almonds', 'w'],
  ['Peanuts (roasted)', 'Nuts & snacks', 585, 24, 21, 50, 30, '1 handful', 'w'],
  ['Cashews', 'Nuts & snacks', 553, 18, 30, 44, 15, '~10 cashews', 'w'],
  ['Walnuts', 'Nuts & snacks', 654, 15, 14, 65, 15, '~4 halves', 'w'],
  ['Mixed nuts', 'Nuts & snacks', 600, 18, 22, 52, 30, '1 handful', 'w'],
  ['Roasted chana', 'Nuts & snacks', 360, 19, 58, 6, 30, '1 handful', 'p'],
  ['Makhana (roasted)', 'Nuts & snacks', 350, 9.7, 77, 0.1, 25, '1 bowl', 'w'],
  ['Dark chocolate (70%)', 'Nuts & snacks', 550, 7.8, 46, 35, 20, '2 squares', 'w'],

  // ── Junk & street food ──
  ['Samosa', 'Street & junk', 260, 4.5, 30, 14, 80, '1 samosa', 'j'],
  ['Bajji / pakora', 'Street & junk', 300, 6, 30, 18, 100, '4 pieces', 'j'],
  ['Bonda', 'Street & junk', 280, 5, 32, 15, 50, '1 bonda', 'j'],
  ['Vada pav', 'Street & junk', 290, 6, 38, 12, 150, '1 vada pav', 'j'],
  ['Pani puri', 'Street & junk', 250, 4, 36, 10, 90, '6 puris', 'j'],
  ['Bhel puri', 'Street & junk', 190, 5, 30, 6, 150, '1 plate', 'j'],
  ['Puffs (egg / veg)', 'Street & junk', 330, 6, 30, 20, 90, '1 puff', 'j'],
  ['Biscuits (Marie type)', 'Street & junk', 440, 7, 75, 12, 8, '1 biscuit', 'j'],
  ['Cream biscuits', 'Street & junk', 480, 5, 70, 20, 12, '1 biscuit', 'j'],
  ['Chips', 'Street & junk', 536, 7, 53, 35, 30, '1 small pack', 'j'],
  ['Mixture / namkeen', 'Street & junk', 520, 12, 45, 33, 30, '1 small bowl', 'j'],
  ['Murukku', 'Street & junk', 520, 8, 55, 30, 25, '1 piece', 'j'],
  ['Pizza', 'Street & junk', 266, 11, 33, 10, 100, '1 slice', 'j'],
  ['Burger', 'Street & junk', 250, 12, 28, 10, 180, '1 burger', 'j'],
  ['French fries', 'Street & junk', 312, 3.4, 41, 15, 120, '1 medium', 'j'],
  ['Cake', 'Street & junk', 350, 5, 50, 15, 70, '1 slice', 'j'],
  ['Milk chocolate', 'Street & junk', 535, 7.6, 59, 30, 25, '1 small bar', 'j'],

  // ── Sweets ──
  ['Gulab jamun', 'Sweets', 380, 6, 50, 17, 40, '1 piece', 'j'],
  ['Jalebi', 'Sweets', 460, 4, 60, 22, 50, '2 pieces', 'j'],
  ['Laddu', 'Sweets', 450, 7, 55, 22, 40, '1 laddu', 'j'],
  ['Mysore pak', 'Sweets', 520, 5, 50, 33, 40, '1 piece', 'j'],
  ['Kesari / halwa', 'Sweets', 370, 3.5, 50, 17, 100, '1 bowl', 'j'],
  ['Payasam / kheer', 'Sweets', 150, 3.5, 22, 5, 150, '1 bowl', 'j'],
  ['Ice cream', 'Sweets', 207, 3.5, 24, 11, 100, '1 scoop', 'j'],

  // ── Drinks ──
  ['Tea (milk + sugar)', 'Drinks', 40, 1.2, 6, 1.2, 150, '1 cup', 'w'],
  ['Coffee (milk + sugar)', 'Drinks', 50, 1.5, 7, 1.6, 150, '1 cup', 'w'],
  ['Black coffee', 'Drinks', 1, 0.1, 0, 0, 200, '1 cup', 'w'],
  ['Green tea', 'Drinks', 1, 0, 0.2, 0, 200, '1 cup', 'w'],
  ['Banana milkshake', 'Drinks', 100, 3, 17, 2.5, 250, '1 glass', 'w'],
  ['Lassi (sweet)', 'Drinks', 100, 3, 15, 3, 250, '1 glass', 'j'],
  ['Fresh fruit juice', 'Drinks', 45, 0.7, 10.4, 0.2, 250, '1 glass', 'w'],
  ['Sugarcane juice', 'Drinks', 60, 0.2, 15, 0, 250, '1 glass', 'j'],
  ['Coconut water', 'Drinks', 19, 0.7, 3.7, 0.2, 250, '1 coconut', 'w'],
  ['Soft drink / cola', 'Drinks', 42, 0, 10.6, 0, 330, '1 can', 'j'],
  ['Beer', 'Drinks', 43, 0.5, 3.6, 0, 330, '1 pint (330 ml)', 'j'],
  ['Whisky / rum', 'Drinks', 250, 0, 0, 0, 30, '1 peg (30 ml)', 'j'],

  // ── Extras ──
  ['Cooking oil', 'Extras', 884, 0, 0, 100, 5, '1 tsp', 'w'],
  ['Ghee', 'Extras', 900, 0, 0, 100, 5, '1 tsp', 'w'],
  ['Sugar', 'Extras', 387, 0, 100, 0, 5, '1 tsp', 'j'],
  ['Honey', 'Extras', 304, 0.3, 82, 0, 7, '1 tsp', 'w'],
  ['Pickle', 'Extras', 200, 2, 10, 17, 15, '1 tbsp', 'w'],
  ['Papad (roasted)', 'Extras', 370, 25, 60, 3, 12, '1 papad', 'w'],
];

const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

export const FOODS = RAW.map(([name, cat, kcal, p, c, f, g, label, tag]) => ({
  id: slug(name), name, cat, kcal, p, c, f, g, label, tag,
}));

export const FOOD_CATS = [...new Set(FOODS.map(f => f.cat))];

export const MEALS = [
  { id: 'breakfast', name: 'Breakfast', icon: '🌅' },
  { id: 'lunch', name: 'Lunch', icon: '☀️' },
  { id: 'snack', name: 'Evening snack', icon: '☕' },
  { id: 'dinner', name: 'Dinner', icon: '🌙' },
];
