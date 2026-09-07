import { db, productsTable } from "@workspace/db";
import { sql } from "drizzle-orm";

const products = [
  // CLEANING
  { category: "cleaning", name: "Bounty Select-A-Size Paper Towels, 12 Double Rolls", description: "Twice as absorbent as generic brands. These paper towels hold up to tough messes.", price: "14.97", wasPrice: "19.99", bulkPrice: "13.47", badge: "Best Value", badgeColor: "green", savings: "Save $5.02", imageUrl: "https://media.gettyimages.com/id/2218820151/photo/novato-california-packages-of-bounty-paper-towels-are-displayed-at-a-target-store-on-june-05.jpg?s=612x612&w=0&k=20&c=c-1V89NEW6JBGKv5pHuX-8fVv6F04CizbbcZ9Ghfu_U=", keywords: ["paper towels", "cleaning", "kitchen"], isSponsored: true, isFeatured: true, inStock: true },
  { category: "cleaning", name: "Dawn Ultra Dish Soap, Original Scent, 90 fl oz", description: "3x more grease-cutting power vs the leading value brand. One drop does a full sink.", price: "8.47", wasPrice: "11.99", bulkPrice: "7.62", badge: "Popular", badgeColor: "orange", savings: "Save $3.52", imageUrl: "https://assets.onegoodthingbyjillee.com/2016/08/prV6vN2R-DSC_5186-745x493.png", keywords: ["dish soap", "cleaning", "dawn"], isSponsored: false, isFeatured: true, inStock: true },
  { category: "cleaning", name: "Lysol Disinfecting Wipes, Lemon & Lime, 4-Pack (320 ct)", description: "Kill 99.9% of viruses and bacteria. Safe on hard, non-porous surfaces.", price: "11.48", wasPrice: "15.97", bulkPrice: "10.33", badge: null, badgeColor: null, savings: "Save $4.49", imageUrl: "https://m.media-amazon.com/images/I/71EeuUMGXRL.jpg", keywords: ["lysol", "wipes", "disinfecting"], isSponsored: false, isFeatured: false, inStock: true },
  { category: "cleaning", name: "Swiffer WetJet Multi-Surface Cleaner Refill, 42.2 fl oz", description: "Powerful dual-nozzle sprayer cleans and dries for 3x the shine vs a string mop.", price: "7.94", wasPrice: "10.49", bulkPrice: "7.15", badge: null, badgeColor: null, savings: "Save $2.55", imageUrl: "https://m.media-amazon.com/images/I/41Nj3VFu8lL.jpg", keywords: ["swiffer", "floor cleaner", "mop"], isSponsored: false, isFeatured: false, inStock: true },
  { category: "cleaning", name: "Comet Powder Cleanser with Bleach, 21 oz, 3-Pack", description: "Multi-surface powder removes tough stains from tubs, tiles, sinks, and pots.", price: "6.97", wasPrice: "8.97", bulkPrice: "6.27", badge: null, badgeColor: null, savings: "Save $2.00", imageUrl: "https://content.oppictures.com/Master_Images/Master_Variants/Variant_240/695968.JPG", keywords: ["comet", "bleach", "powder cleanser"], isSponsored: false, isFeatured: false, inStock: true },
  { category: "cleaning", name: "Glad ForceFlex Plus Tall Kitchen Trash Bags, 13 Gal, 100 ct", description: "Stretchable strength prevents rips and tears even with sharp, heavy items.", price: "16.47", wasPrice: "21.99", bulkPrice: "14.82", badge: "Bulk Deal", badgeColor: "blue", savings: "Save $5.52", imageUrl: "https://content.oppictures.com/Master_Images/Master_Variants/Variant_240/701936.JPG", keywords: ["trash bags", "garbage bags", "kitchen"], isSponsored: true, isFeatured: true, inStock: true },

  // KITCHEN
  { category: "kitchen", name: "Reynolds Wrap Heavy Duty Aluminum Foil, 200 sq ft", description: "Heavy-duty protection for grilling, roasting, and freezer storage.", price: "9.97", wasPrice: "13.49", bulkPrice: "8.97", badge: null, badgeColor: null, savings: "Save $3.52", imageUrl: "https://i5.walmartimages.com/seo/Reynolds-Wrap-Heavy-Duty-Aluminum-Foil-12-Inch-Width-100-square-feet_d796f34b-279a-4167-ad78-1cd34f6ed351.79ac91ab3247c1ac8df0b18ea846bcaa.jpeg?odnHeight=573&odnWidth=573&odnBg=FFFFFF", keywords: ["aluminum foil", "reynolds", "cooking"], isSponsored: false, isFeatured: false, inStock: true },
  { category: "kitchen", name: "Ziploc Freezer Bags, Gallon Size, 150 ct", description: "Double zipper seal and BPA-free construction. Great for meal prep and food storage.", price: "12.47", wasPrice: "16.49", bulkPrice: "11.22", badge: "Family Pack", badgeColor: "orange", savings: "Save $4.02", imageUrl: "https://i5.walmartimages.com/seo/Ziploc-2-Gallon-Freezer-Bags-Extra-Large-Size-2-gal-13-Width-10-Box-Food-Money-Meat-Poultry-Fish-Soup_a7196eb7-d9ae-4c83-b633-a61dbb642837.106edfa0fdfa525cc3cb8dc67ce2a1e4.jpeg?odnHeight=573&odnWidth=573&odnBg=FFFFFF", keywords: ["ziploc", "freezer bags", "storage"], isSponsored: false, isFeatured: true, inStock: true },
  { category: "kitchen", name: "Glad Press'n Seal Wrap, 140 sq ft", description: "Creates an airtight seal on any shape. Perfect for leftovers, bowls, and produce.", price: "5.97", wasPrice: "7.99", bulkPrice: "5.37", badge: null, badgeColor: null, savings: "Save $2.02", imageUrl: "https://i5.peapod.com/c/DW/DW54Z.png", keywords: ["plastic wrap", "glad", "food storage"], isSponsored: false, isFeatured: false, inStock: true },
  { category: "kitchen", name: "Dixie Paper Plates, 10 in, 220 ct", description: "Soak-proof shield keeps plate from becoming soggy. Microwaveable.", price: "18.97", wasPrice: "24.99", bulkPrice: "17.07", badge: "Bulk", badgeColor: "blue", savings: "Save $6.02", imageUrl: "https://www.quill.com/is/image/Quill/4EEA2D5F-3D75-4533-89973869543A37AD_s7?wid=1536&hei=1536", keywords: ["paper plates", "dixie", "disposable"], isSponsored: false, isFeatured: false, inStock: true },

  // BATHROOM
  { category: "bathroom", name: "Charmin Ultra Strong Toilet Paper, 30 Mega Rolls", description: "4x stronger when wet vs leading 1-ply. Each mega roll = 2.5 regular rolls.", price: "22.97", wasPrice: "29.99", bulkPrice: "20.67", badge: "Top Pick", badgeColor: "green", savings: "Save $7.02", imageUrl: "https://di2ponv0v5otw.cloudfront.net/posts/2023/11/19/6559f64627539dc414908157/m_6559f64958083dcf0a30c391.jpeg", keywords: ["toilet paper", "charmin", "bathroom"], isSponsored: true, isFeatured: true, inStock: true },
  { category: "bathroom", name: "Softsoap Liquid Hand Soap Refill, Aquarium Series, 50 fl oz", description: "Effectively washes away dirt and germs. Gentle on skin with a fresh clean scent.", price: "5.97", wasPrice: "8.49", bulkPrice: "5.37", badge: null, badgeColor: null, savings: "Save $2.52", imageUrl: "https://i5.walmartimages.com/seo/Softsoap-Softsoap-Liquid-Hand-Wash-Seasonal-Variants_e7e26157-9983-4567-85e2-bc7b5ea249ac.0183779ae25021c3d3b676f55d897698.jpeg?odnHeight=576&odnWidth=576&odnBg=FFFFFF", keywords: ["hand soap", "softsoap", "liquid soap"], isSponsored: false, isFeatured: false, inStock: true },
  { category: "bathroom", name: "Crest 3D White Toothpaste, 4.1 oz, 3-Pack", description: "Removes up to 90% of surface stains in just 5 days. Fluoride cavity protection.", price: "11.47", wasPrice: "15.99", bulkPrice: "10.32", badge: null, badgeColor: null, savings: "Save $4.52", imageUrl: "https://thumbs.dreamstime.com/b/tube-crest-d-white-toothpaste-black-backdrop-tube-crest-d-white-toothpaste-116140622.jpg", keywords: ["toothpaste", "crest", "dental"], isSponsored: false, isFeatured: false, inStock: true },

  // LAUNDRY
  { category: "laundry", name: "Tide Original Liquid Laundry Detergent, 154 fl oz (100 loads)", description: "America's #1 detergent cleans and fights stains in both hot and cold water.", price: "19.97", wasPrice: "26.99", bulkPrice: "17.97", badge: "Best Seller", badgeColor: "orange", savings: "Save $7.02", imageUrl: "https://images.ctfassets.net/ajjw8wywicb3/5FaiqVeXW2J5LgDrWrotQM/1035f44afdfd3a0670391c22851af161/Final_article_preview_TideLiquidBottle_In_A003_C066_00-370x320.jpg?fm=png", keywords: ["tide", "laundry detergent", "washing"], isSponsored: true, isFeatured: true, inStock: true },
  { category: "laundry", name: "Downy Ultra Liquid Fabric Softener, April Fresh, 129 fl oz", description: "Reduces static cling and wrinkles. Keeps clothes feeling soft and smelling fresh.", price: "14.97", wasPrice: "19.49", bulkPrice: "13.47", badge: null, badgeColor: null, savings: "Save $4.52", imageUrl: "https://m.media-amazon.com/images/I/41oGWHPM2vL.jpg", keywords: ["downy", "fabric softener", "laundry"], isSponsored: false, isFeatured: false, inStock: true },
  { category: "laundry", name: "Bounce Fabric Softener Dryer Sheets, Fresh Linen, 250 ct", description: "Reduces static cling and wrinkles. Leaves clothes feeling soft with a fresh scent.", price: "8.97", wasPrice: "11.99", bulkPrice: "8.07", badge: null, badgeColor: null, savings: "Save $3.02", imageUrl: "https://www.instacart.com/assets/domains/product-image/file/large_42405883-7eab-4a68-a4e8-921a4d56a874.png", keywords: ["bounce", "dryer sheets", "laundry"], isSponsored: false, isFeatured: false, inStock: true },

  // PANTRY
  { category: "pantry", name: "Folgers Classic Roast Ground Coffee, 40.3 oz", description: "Wake up to a fresh pot of America's favorite coffee. Rich, smooth flavor.", price: "10.97", wasPrice: "14.99", bulkPrice: "9.87", badge: "Daily Essential", badgeColor: "orange", savings: "Save $4.02", imageUrl: "https://eltesorosm.com/cdn/shop/files/025500304076-FolgersClassicRoastGroundCoffee30.5oz.Canister_612x612.jpg?v=1690904529", keywords: ["coffee", "folgers", "ground coffee"], isSponsored: false, isFeatured: true, inStock: true },
  { category: "pantry", name: "Crystal Light Drink Mix Variety Pack, 44 On-the-Go Packets", description: "10 calories per serving. Great tasting hydration with zero sugar.", price: "7.47", wasPrice: "9.99", bulkPrice: "6.72", badge: null, badgeColor: null, savings: "Save $2.52", imageUrl: "https://content.oppictures.com/Master_Images/Master_Variants/Variant_240/180367.JPG", keywords: ["crystal light", "drink mix", "beverages"], isSponsored: false, isFeatured: false, inStock: true },

  // BABY
  { category: "baby", name: "Pampers Swaddlers Diapers, Size 2, 148 ct", description: "Trusted #1 by US hospitals. Unique absorb-away liner pulls wetness away from baby's skin.", price: "32.97", wasPrice: "44.99", bulkPrice: "29.67", badge: "Hospital Choice", badgeColor: "blue", savings: "Save $12.02", imageUrl: "https://i5.walmartimages.com/asr/569ef17c-dd1b-43c0-b24c-c6b1d61c8733.92945d767d0144c888a8f160bc26383c.jpeg?odnHeight=448&odnWidth=448&odnBg=FFFFFF", keywords: ["pampers", "diapers", "baby"], isSponsored: true, isFeatured: true, inStock: true },
  { category: "baby", name: "Huggies Natural Care Sensitive Baby Wipes, 99% Water, 672 ct", description: "Hypoallergenic, fragrance-free, and dermatologist tested. Gentle on sensitive skin.", price: "19.97", wasPrice: "26.99", bulkPrice: "17.97", badge: "Sensitive", badgeColor: "green", savings: "Save $7.02", imageUrl: "https://i.pinimg.com/originals/2b/c1/82/2bc182c16c34b8fc395e215f92765320.jpg", keywords: ["huggies", "baby wipes", "sensitive"], isSponsored: false, isFeatured: true, inStock: true },

  // PET
  { category: "pet", name: "Purina Pro Plan Adult Dry Dog Food, Chicken & Rice, 47 lb", description: "Real chicken is the #1 ingredient. High protein formula for strong muscles.", price: "44.97", wasPrice: "59.99", bulkPrice: "40.47", badge: "Vet Recommended", badgeColor: "blue", savings: "Save $15.02", imageUrl: "https://image.chewy.com/catalog/general/images/moe/0679d396-159e-7644-8000-f8dd5bdc4f7f._AC_SS300_V1_.jpg", keywords: ["dog food", "purina", "pet"], isSponsored: false, isFeatured: true, inStock: true },
  { category: "pet", name: "Fresh Step Advanced Clumping Cat Litter, 37 lb", description: "Febreeze odor defense eliminates litter box odors for 10 days. Easy scoop formula.", price: "21.97", wasPrice: "29.99", bulkPrice: "19.77", badge: null, badgeColor: null, savings: "Save $8.02", imageUrl: "https://image.chewy.com/catalog/general/images/moe/069bc545-ee05-7a6f-8000-051d9240a96a._AC_SL248_V1_.jpg", keywords: ["cat litter", "fresh step", "pet"], isSponsored: false, isFeatured: false, inStock: true },

  // HEALTH
  { category: "health", name: "Tylenol Extra Strength Caplets, 500 mg, 225 ct", description: "Temporarily relieves minor aches and pains and reduces fever. Trusted for 60+ years.", price: "14.97", wasPrice: "19.99", bulkPrice: "13.47", badge: null, badgeColor: null, savings: "Save $5.02", imageUrl: "https://i5.samsclubimages.com/asr/be5d35e3-a8f9-4e8c-b4f5-55de4e1a3e2b.156d1e6442cfe066bc5e74e4745d5996.jpeg?odnHeight=640&odnWidth=640&odnBg=FFFFFF", keywords: ["tylenol", "pain relief", "health"], isSponsored: false, isFeatured: false, inStock: true },
  { category: "health", name: "Band-Aid Brand Flexible Fabric Adhesive Bandages, Variety Pack, 120 ct", description: "Flexible fabric moves with your body. QUILTVENT technology promotes healing.", price: "8.47", wasPrice: "11.99", bulkPrice: "7.62", badge: null, badgeColor: null, savings: "Save $3.52", imageUrl: "https://us.evocdn.io/dealer/1152/catalog/product/images/300-4711.png", keywords: ["band-aid", "bandages", "first aid"], isSponsored: false, isFeatured: false, inStock: true },

  // BATTERIES
  { category: "batteries", name: "Energizer AA Batteries, Max Alkaline, 48-Pack", description: "Holds power for up to 12 years in storage. Leak resistant to protect your devices.", price: "18.97", wasPrice: "24.99", bulkPrice: "17.07", badge: "Best Value", badgeColor: "green", savings: "Save $6.02", imageUrl: "https://i.ebayimg.com/images/g/5PEAAeSwgZxoY-JI/s-l225.jpg", keywords: ["batteries", "energizer", "AA"], isSponsored: true, isFeatured: true, inStock: true },
  { category: "batteries", name: "Duracell CopperTop AAA Batteries, 36-Pack", description: "Guaranteed for 10 years in storage. Duralock technology keeps power locked in.", price: "15.97", wasPrice: "21.49", bulkPrice: "14.37", badge: null, badgeColor: null, savings: "Save $5.52", imageUrl: "https://i5.walmartimages.com/seo/Duracell-Coppertop-AAA-Battery-with-POWER-BOOST-24-Pack-Long-Lasting-Batteries_600f1acc-70e6-40d8-b134-f15db9356735.2909fcc5e8f5e8abd4c9f62a60be0737.png?odnHeight=573&odnWidth=573&odnBg=FFFFFF", keywords: ["batteries", "duracell", "AAA"], isSponsored: false, isFeatured: false, inStock: true },

  // LIGHTING
  { category: "lighting", name: "Feit Electric LED A19 Light Bulb, 60W Equiv, 10-Pack", description: "Uses only 8.5 watts, lasts 15,000 hours. Significant savings vs traditional incandescent.", price: "12.97", wasPrice: "17.99", bulkPrice: "11.67", badge: "Energy Saver", badgeColor: "green", savings: "Save $5.02", imageUrl: "https://i.ebayimg.com/images/g/tYYAAeSwgaVpYDJz/s-l960.webp", keywords: ["light bulbs", "LED", "lighting"], isSponsored: false, isFeatured: false, inStock: true },

  // OFFICE
  { category: "office", name: "Amazon Basics Multipurpose Copy Paper, 20 lb, 8.5x11, 10 Reams (5,000 Sheets)", description: "Works in all home and office inkjet and laser printers, copiers, and fax machines.", price: "29.97", wasPrice: "39.99", bulkPrice: "26.97", badge: "Office Staple", badgeColor: "blue", savings: "Save $10.02", imageUrl: "https://m.media-amazon.com/images/I/711PTOxILrL.jpg", keywords: ["copy paper", "office paper", "printer paper"], isSponsored: false, isFeatured: false, inStock: true },
];

async function seed() {
  console.log("Seeding products...");

  // Clear existing products
  await db.delete(productsTable);

  // Insert all products
  const inserted = await db.insert(productsTable).values(
    products.map(p => ({
      ...p,
      price: p.price,
      wasPrice: p.wasPrice || null,
      bulkPrice: p.bulkPrice || null,
      badge: p.badge || null,
      badgeColor: p.badgeColor || null,
      savings: p.savings || null,
      imageUrl: p.imageUrl || null,
      keywords: p.keywords,
      similar: [],
    }))
  ).returning();

  console.log(`Seeded ${inserted.length} products`);
  process.exit(0);
}

seed().catch(err => {
  console.error("Seed failed:", err);
  process.exit(1);
});
