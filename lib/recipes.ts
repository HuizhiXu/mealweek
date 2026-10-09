export type MealType = "breakfast" | "lunch" | "dinner";
export type Aisle = "蔬果" | "肉类海鲜" | "乳品蛋" | "主食干货" | "调味品" | "冷冻";

export type Ingredient = {
  key: string;
  name: string;
  amount: number;
  unit: string;
  aisle: Aisle;
};

export type Recipe = {
  id: string;
  name: string;
  subtitle: string;
  category: MealType;
  image: string;
  time: number;
  servings: number;
  ingredients: Ingredient[];
  steps: string[];
};

export const RECIPES: Recipe[] = [
  {
    id: "avocado-egg-toast",
    name: "牛油果溏心蛋吐司",
    subtitle: "酥脆酸种 · 清晨十分钟",
    category: "breakfast",
    image: "/manus-storage/async-images/ru8vWqjDt8QKD9AkOKODsk/image-1.webp",
    time: 10,
    servings: 1,
    ingredients: [
      { key: "sourdough", name: "全麦酸种吐司", amount: 2, unit: "片", aisle: "主食干货" },
      { key: "egg", name: "鸡蛋", amount: 1, unit: "个", aisle: "乳品蛋" },
      { key: "avocado", name: "牛油果", amount: 0.5, unit: "个", aisle: "蔬果" },
      { key: "sesame", name: "白芝麻", amount: 2, unit: "g", aisle: "调味品" },
    ],
    steps: ["吐司烤至边缘金黄。", "牛油果压成泥，抹在吐司上。", "煮一颗溏心蛋切开，撒白芝麻即可。"],
  },
  {
    id: "berry-yogurt-oats",
    name: "莓果酸奶燕麦碗",
    subtitle: "前一晚备好 · 早晨即食",
    category: "breakfast",
    image: "/manus-storage/async-images/ru8vWqjDt8QKD9AkOKODsk/image-2.webp",
    time: 5,
    servings: 1,
    ingredients: [
      { key: "greek-yogurt", name: "希腊酸奶", amount: 140, unit: "g", aisle: "乳品蛋" },
      { key: "oats", name: "燕麦片", amount: 45, unit: "g", aisle: "主食干货" },
      { key: "strawberry", name: "草莓", amount: 60, unit: "g", aisle: "蔬果" },
      { key: "blueberry", name: "蓝莓", amount: 40, unit: "g", aisle: "蔬果" },
      { key: "honey", name: "蜂蜜", amount: 8, unit: "g", aisle: "调味品" },
    ],
    steps: ["前一晚将燕麦和酸奶拌匀，冷藏。", "草莓切片，和蓝莓一起铺在表面。", "淋少许蜂蜜，撒一把燕麦脆即可。"],
  },
  {
    id: "chicken-quinoa-bowl",
    name: "柠香鸡肉藜麦碗",
    subtitle: "清爽饱腹 · 午餐带着走",
    category: "lunch",
    image: "/manus-storage/async-images/ru8vWqjDt8QKD9AkOKODsk/image-3.webp",
    time: 25,
    servings: 1,
    ingredients: [
      { key: "chicken", name: "鸡胸肉", amount: 150, unit: "g", aisle: "肉类海鲜" },
      { key: "quinoa", name: "藜麦", amount: 60, unit: "g", aisle: "主食干货" },
      { key: "cucumber", name: "黄瓜", amount: 0.5, unit: "个", aisle: "蔬果" },
      { key: "cherry-tomato", name: "樱桃番茄", amount: 80, unit: "g", aisle: "蔬果" },
      { key: "spinach", name: "嫩菠菜", amount: 30, unit: "g", aisle: "蔬果" },
      { key: "lemon", name: "柠檬", amount: 0.5, unit: "个", aisle: "蔬果" },
      { key: "olive-oil", name: "橄榄油", amount: 10, unit: "ml", aisle: "调味品" },
    ],
    steps: ["藜麦洗净，按包装说明煮熟。", "鸡胸肉以盐、黑胡椒和柠檬汁腌十分钟后煎熟。", "与切好的黄瓜、番茄和菠菜一起装碗，淋橄榄油。"],
  },
  {
    id: "tomato-chickpea-pasta",
    name: "烤番茄鹰嘴豆意面",
    subtitle: "一锅搞定 · 周中晚餐",
    category: "dinner",
    image: "/manus-storage/async-images/ru8vWqjDt8QKD9AkOKODsk/image-4.webp",
    time: 22,
    servings: 1,
    ingredients: [
      { key: "penne", name: "短管意面", amount: 90, unit: "g", aisle: "主食干货" },
      { key: "cherry-tomato", name: "樱桃番茄", amount: 120, unit: "g", aisle: "蔬果" },
      { key: "chickpeas", name: "鹰嘴豆", amount: 80, unit: "g", aisle: "主食干货" },
      { key: "spinach", name: "嫩菠菜", amount: 25, unit: "g", aisle: "蔬果" },
      { key: "basil", name: "罗勒叶", amount: 5, unit: "g", aisle: "蔬果" },
      { key: "parmesan", name: "帕玛森芝士", amount: 15, unit: "g", aisle: "乳品蛋" },
      { key: "olive-oil", name: "橄榄油", amount: 5, unit: "ml", aisle: "调味品" },
    ],
    steps: ["意面煮至略带嚼劲，留少许煮面水。", "番茄和鹰嘴豆加橄榄油煎至微焦。", "拌入意面和菠菜，刨上芝士并以罗勒点缀。"],
  },
  {
    id: "salmon-rice-bowl",
    name: "照烧三文鱼饭碗",
    subtitle: "鲜嫩鱼排 · 轻松一人食",
    category: "dinner",
    image: "/manus-storage/async-images/ru8vWqjDt8QKD9AkOKODsk/image-5.webp",
    time: 20,
    servings: 1,
    ingredients: [
      { key: "salmon", name: "三文鱼排", amount: 140, unit: "g", aisle: "肉类海鲜" },
      { key: "rice", name: "大米", amount: 75, unit: "g", aisle: "主食干货" },
      { key: "edamame", name: "毛豆仁", amount: 50, unit: "g", aisle: "冷冻" },
      { key: "cucumber", name: "黄瓜", amount: 0.5, unit: "个", aisle: "蔬果" },
      { key: "scallion", name: "小葱", amount: 1, unit: "根", aisle: "蔬果" },
      { key: "soy-sauce", name: "酱油", amount: 10, unit: "ml", aisle: "调味品" },
      { key: "sesame", name: "白芝麻", amount: 2, unit: "g", aisle: "调味品" },
    ],
    steps: ["大米煮熟，毛豆仁焯水。", "三文鱼煎至表面金黄，加入酱油略收汁。", "鱼排搭配米饭、毛豆和黄瓜，撒上葱花及芝麻。"],
  },
];

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "早餐",
  lunch: "午餐",
  dinner: "晚餐",
};

export const CATEGORY_LABELS: Record<MealType, string> = {
  breakfast: "早餐",
  lunch: "午餐",
  dinner: "晚餐",
};

export function findRecipe(recipeId?: string) {
  return RECIPES.find((recipe) => recipe.id === recipeId);
}
