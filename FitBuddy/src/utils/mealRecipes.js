const recipe = (key, name, minutes, macros, tags, ingredients, steps) => ({
  key, name, minutes, macros, tags, ingredients, steps, sourceUrl: '', sourceLabel: 'HabitBuddy original',
})

const balanced = [
  recipe('grain-bowl', 'Roasted Veg & Chickpea Bowl', 30, { calories: 485, protein: 18, carbs: 67, fat: 16 }, ['vegetarian', 'high-fibre', 'meal-prep', 'budget-friendly'], ['¾ cup cooked quinoa', '½ cup chickpeas, rinsed', '1 cup chopped seasonal vegetables', '1 tsp olive oil', '2 tbsp lemon-tahini dressing'], ['Roast vegetables with olive oil at 220°C for 20 minutes.', 'Serve over quinoa with chickpeas and dressing.']),
  recipe('tofu-wrap', 'Crispy Tofu Rainbow Wrap', 20, { calories: 430, protein: 23, carbs: 51, fat: 15 }, ['vegetarian', 'quick', 'meal-prep'], ['150 g firm tofu, cubed', '1 wholegrain wrap', '½ cup shredded cabbage and carrot', '1 tbsp plain yogurt or plant yogurt', '1 tsp soy sauce'], ['Pan-sear tofu with soy sauce until golden.', 'Fill the wrap with tofu, vegetables, and yogurt sauce.']),
  recipe('lentil-soup', 'Tomato Lentil Soup', 35, { calories: 390, protein: 21, carbs: 58, fat: 8 }, ['vegetarian', 'dairy-free', 'high-fibre', 'budget-friendly', 'meal-prep'], ['¾ cup cooked lentils', '1 cup crushed tomatoes', '½ cup diced onion and carrot', '1 cup low-sodium vegetable stock', '½ tsp cumin'], ['Soften onion and carrot in a pot.', 'Add lentils, tomatoes, stock, and cumin; simmer for 20 minutes.']),
  recipe('salmon-salad', 'Lemon Salmon & Greens', 25, { calories: 510, protein: 36, carbs: 39, fat: 23 }, ['quick', 'gluten-free', 'high-protein'], ['120 g salmon fillet', '2 cups mixed greens', '½ cup cooked brown rice', '½ lemon', '1 tsp olive oil'], ['Bake salmon at 200°C for 12–15 minutes with lemon.', 'Serve with greens and brown rice.']),
  recipe('overnight-oats', 'Berry Overnight Oats', 10, { calories: 405, protein: 19, carbs: 59, fat: 11 }, ['vegetarian', 'quick', 'meal-prep', 'high-fibre'], ['½ cup rolled oats', '½ cup milk or soy milk', '½ cup berries', '2 tbsp Greek or soy yogurt', '1 tbsp chia seeds'], ['Stir everything together in a jar.', 'Chill overnight and serve cold.']),
]

const lighter = [
  recipe('chicken-salad', 'Chicken & Crunchy Greens', 20, { calories: 420, protein: 38, carbs: 34, fat: 14 }, ['quick', 'high-protein', 'gluten-free'], ['120 g cooked chicken breast', '2 cups mixed greens', '½ cup cucumber and tomato', '¼ avocado', '1 tbsp lemon vinaigrette'], ['Slice the chicken and vegetables.', 'Toss with greens and vinaigrette.']),
  recipe('egg-veggie', 'Veggie Egg Skillet', 15, { calories: 360, protein: 25, carbs: 28, fat: 16 }, ['vegetarian', 'quick', 'gluten-free', 'budget-friendly'], ['2 eggs', '1 cup spinach and chopped tomato', '½ cup diced potato, cooked', '1 tsp olive oil', '1 tbsp salsa'], ['Warm oil and cook vegetables until tender.', 'Add eggs and scramble; finish with salsa.']),
  recipe('tuna-bean', 'Tuna & White Bean Lemon Bowl', 10, { calories: 405, protein: 34, carbs: 43, fat: 10 }, ['quick', 'no-cook', 'dairy-free', 'high-protein', 'budget-friendly'], ['1 small can tuna, drained', '½ cup white beans, rinsed', '1 cup chopped cucumber and tomato', '1 tbsp lemon juice', '1 tsp olive oil'], ['Combine tuna, beans, and vegetables.', 'Dress with lemon and olive oil.']),
  recipe('tofu-stirfry', 'Ginger Tofu & Broccoli', 25, { calories: 440, protein: 27, carbs: 54, fat: 13 }, ['vegetarian', 'dairy-free', 'meal-prep', 'high-protein'], ['180 g firm tofu', '1½ cups broccoli florets', '½ cup cooked brown rice', '1 tbsp low-sodium soy sauce', '1 tsp grated ginger'], ['Pan-sear tofu until golden.', 'Add broccoli, ginger, and a splash of water; cook until tender and serve over rice.']),
  recipe('yogurt-fruit', 'Yogurt, Fruit & Seed Cup', 5, { calories: 330, protein: 24, carbs: 42, fat: 8 }, ['vegetarian', 'quick', 'no-cook', 'high-protein'], ['¾ cup Greek or soy yogurt', '1 small banana', '½ cup berries', '1 tbsp pumpkin seeds', '¼ cup rolled oats'], ['Layer yogurt, fruit, oats, and seeds in a bowl.']),
]

const protein = [
  recipe('turkey-rice', 'Turkey & Rice Power Bowl', 25, { calories: 560, protein: 42, carbs: 66, fat: 14 }, ['high-protein', 'meal-prep', 'dairy-free'], ['140 g lean ground turkey', '¾ cup cooked brown rice', '½ cup edamame', '½ cup shredded carrot', '1 tbsp low-sodium soy sauce'], ['Cook turkey in a pan until fully cooked.', 'Serve with rice, edamame, carrot, and soy sauce.']),
  recipe('cottage-toast', 'Cottage Cheese Savoury Toast', 10, { calories: 390, protein: 31, carbs: 42, fat: 11 }, ['vegetarian', 'quick', 'high-protein'], ['2 slices wholegrain toast', '½ cup cottage cheese', '½ cup sliced tomato', '1 tsp sesame seeds', 'Black pepper'], ['Toast the bread and spread with cottage cheese.', 'Top with tomato, sesame, and pepper.']),
  recipe('salmon-potato', 'Salmon, Potato & Greens Plate', 30, { calories: 590, protein: 39, carbs: 54, fat: 22 }, ['high-protein', 'gluten-free', 'meal-prep'], ['140 g salmon fillet', '1 medium potato, cubed', '1 cup green beans', '1 tsp olive oil', '1 tbsp plain yogurt and dill'], ['Roast potato cubes at 220°C for 25 minutes.', 'Bake salmon and steam green beans; serve with yogurt-dill sauce.']),
  recipe('tempeh-noodles', 'Tempeh Peanut Noodles', 20, { calories: 610, protein: 32, carbs: 72, fat: 23 }, ['vegetarian', 'high-protein', 'quick', 'meal-prep'], ['120 g tempeh, sliced', '75 g wholegrain noodles', '1 cup shredded vegetables', '1 tbsp peanut butter', '1 tsp soy sauce and lime'], ['Cook noodles and pan-sear tempeh.', 'Mix peanut butter, soy, lime, and warm water; toss with noodles and vegetables.']),
  recipe('chicken-pita', 'Chicken Hummus Pita', 15, { calories: 520, protein: 40, carbs: 58, fat: 15 }, ['high-protein', 'quick', 'meal-prep'], ['120 g cooked chicken', '1 wholegrain pita', '2 tbsp hummus', '½ cup chopped cucumber and tomato', 'A handful of spinach'], ['Spread hummus inside the pita.', 'Fill with chicken, vegetables, and spinach.']),
]

const sleep = [
  recipe('kiwi-yogurt', 'Kiwi & Yogurt Oat Bowl', 8, { calories: 370, protein: 22, carbs: 54, fat: 8 }, ['vegetarian', 'quick', 'no-cook'], ['¾ cup Greek or soy yogurt', '½ cup rolled oats', '1 sliced kiwi', '1 tbsp pumpkin seeds', '½ cup milk or soy milk'], ['Stir oats and milk into yogurt.', 'Top with kiwi and pumpkin seeds.']),
  recipe('chamomile-oats', 'Warm Apple Cinnamon Oats', 12, { calories: 350, protein: 13, carbs: 61, fat: 8 }, ['vegetarian', 'quick', 'budget-friendly', 'high-fibre'], ['½ cup rolled oats', '1 cup milk or soy milk', '½ diced apple', '½ tsp cinnamon', '1 tbsp chopped walnuts'], ['Simmer oats, milk, apple, and cinnamon until creamy.', 'Top with walnuts.']),
  recipe('miso-tofu', 'Miso Tofu & Rice Soup', 20, { calories: 430, protein: 24, carbs: 57, fat: 12 }, ['vegetarian', 'quick', 'dairy-free'], ['120 g soft tofu', '1 tbsp miso paste', '½ cup cooked rice', '1 cup mushrooms and spinach', '2 cups hot water or stock'], ['Whisk miso into hot stock.', 'Add mushrooms, tofu, and spinach; simmer gently and serve with rice.']),
  recipe('banana-smoothie', 'Banana Oat Smoothie', 5, { calories: 390, protein: 20, carbs: 58, fat: 10 }, ['vegetarian', 'quick', 'no-cook'], ['1 banana', '¾ cup milk or soy milk', '¼ cup oats', '½ cup Greek or soy yogurt', '1 tbsp almond butter'], ['Blend all ingredients until smooth.']),
  recipe('chickpea-toast', 'Chickpea Avocado Toast', 10, { calories: 420, protein: 17, carbs: 56, fat: 16 }, ['vegetarian', 'quick', 'dairy-free', 'high-fibre'], ['½ cup chickpeas, rinsed', '2 slices wholegrain toast', '¼ avocado', '1 tbsp lemon juice', '½ tsp paprika'], ['Mash chickpeas, avocado, lemon, and paprika.', 'Spread over toast.']),
]

const groups = { wellness: balanced, 'weight-loss': lighter, 'muscle-gain': protein, cardio: balanced, strength: protein, mobility: balanced, sleep }
export const recipesForGoal = (goal) => groups[goal] || balanced

export const MEAL_FILTERS = [
  { value: 'quick', label: 'Quick', aliases: ['fast', 'under 20', '15 min'] },
  { value: 'high-protein', label: 'High protein', aliases: ['protein', 'more protein'] },
  { value: 'vegetarian', label: 'Vegetarian', aliases: ['veggie', 'plant based', 'plant-based', 'no meat'] },
  { value: 'dairy-free', label: 'Dairy-free', aliases: ['no dairy', 'lactose free', 'without dairy'] },
  { value: 'budget-friendly', label: 'Budget-friendly', aliases: ['cheap', 'low cost', 'affordable', 'budget', 'inexpensive'] },
  { value: 'meal-prep', label: 'Meal prep', aliases: ['meal prep', 'prep ahead', 'batch cook'] },
  { value: 'no-cook', label: 'No-cook', aliases: ['no cook', 'no-cooking'] },
  { value: 'lower-calorie', label: 'Lighter options', aliases: ['low calorie', 'lower calorie', 'lighter'] },
  { value: 'gluten-free', label: 'Gluten-free', aliases: ['gluten free', 'no gluten'] },
]
