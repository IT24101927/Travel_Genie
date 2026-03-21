'use strict';
/**
 * Seed all 25 Sri Lanka districts with full content data.
 * Safe to run multiple times — updates existing rows by name.
 *
 * Usage:  node utils/seedDistricts.js
 */

require('dotenv').config();
const { sequelize } = require('../config/database');
const District = require('../modules/placeManagement/models/District');

const DISTRICTS = [
  // Western Province
  {
    name: 'Colombo', province: 'Western',
    description: 'The vibrant commercial capital packed with colonial history, a modern skyline, lively markets and a buzzing food and nightlife scene.',
    highlights: ['Gangaramaya Temple', 'Galle Face Green', 'Pettah Market', 'National Museum'],
    best_for: ['City life', 'Shopping', 'Culture', 'Dining'],
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/Colombo_skyline.jpg/960px-Colombo_skyline.jpg',
  },
  {
    name: 'Gampaha', province: 'Western',
    description: 'Home to lush wetlands and the internationally acclaimed Pinnawala Elephant Orphanage, just north of Colombo.',
    highlights: ['Pinnawala Elephant Orphanage', 'Attanagalla Rajamaha Viharaya', 'Bolgoda Lake', 'Henarathgoda Botanical Garden'],
    best_for: ['Wildlife', 'Nature', 'Family'],
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/25/Pinnawala_Elephant_Orphanage.jpg/960px-Pinnawala_Elephant_Orphanage.jpg',
  },
  {
    name: 'Kalutara', province: 'Western',
    description: 'A coastal gem south of Colombo with golden beaches, the iconic Kalutara Bodhiya stupa, Bentota River and mangrove lagoons.',
    highlights: ['Kalutara Beach', 'Bodhiya Stupa', 'Bentota River', 'Richmond Castle'],
    best_for: ['Beach', 'Water sports', 'Relaxation'],
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Kalutara_Bodhiya_at_dusk.jpg/960px-Kalutara_Bodhiya_at_dusk.jpg',
  },
  // Central Province
  {
    name: 'Kandy', province: 'Central',
    description: "Sri Lanka's cultural capital, home to the sacred Temple of the Tooth Relic, beautiful Kandy Lake and vibrant Kandyan dance performances.",
    highlights: ['Temple of the Tooth', 'Kandy Lake', 'Peradeniya Botanical Gardens', 'Esala Perahera'],
    best_for: ['Culture', 'History', 'Nature'],
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/Temple_of_the_tooth.jpg/960px-Temple_of_the_tooth.jpg',
  },
  {
    name: 'Matale', province: 'Central',
    description: 'A spice-rich district dotted with aromatic spice gardens, the fascinating Nalanda Gedige ruins and ancient cave temples.',
    highlights: ['Nalanda Gedige', 'Spice Gardens', 'Aluvihara Rock Temple', 'Sigiriya (nearby)'],
    best_for: ['History', 'Culture', 'Nature'],
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/Sri_Lanka_Nalanda_Gedige.jpg/960px-Sri_Lanka_Nalanda_Gedige.jpg',
  },
  {
    name: 'Nuwara Eliya', province: 'Central',
    description: "Sri Lanka's \"Little England\" — a misty hill station at 1,868 m surrounded by manicured tea estates, colonial bungalows and stunning waterfalls.",
    highlights: ['Tea Factories', "Horton Plains & World's End", 'Gregory Lake', 'Hakgala Botanical Garden'],
    best_for: ['Tea trails', 'Hiking', 'Scenic views', 'Cool climate'],
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/Nuwara_Eliya_tea_estate.jpg/960px-Nuwara_Eliya_tea_estate.jpg',
  },
  // Southern Province
  {
    name: 'Galle', province: 'Southern',
    description: 'A UNESCO World Heritage fort city with cobblestone streets, Dutch colonial architecture, boutique hotels and panoramic ocean views.',
    highlights: ['Galle Fort', 'Dutch Reformed Church', 'Lighthouse', 'Jungle Beach'],
    best_for: ['History', 'Beach', 'Culture', 'Architecture'],
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/54/SL_Galle_Fort_asv2020-01_img24.jpg/960px-SL_Galle_Fort_asv2020-01_img24.jpg',
  },
  {
    name: 'Matara', province: 'Southern',
    description: 'A laid-back southern district with pristine beaches, the historic Star Fort, the Paravi Duwa temple island and world-class surfing at Mirissa.',
    highlights: ['Mirissa Beach', 'Star Fort', 'Paravi Duwa Temple', 'Dondra Head Lighthouse'],
    best_for: ['Beach', 'Surfing', 'Whale watching', 'History'],
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/df/Mirissa_Beach_Sri_Lanka.jpg/960px-Mirissa_Beach_Sri_Lanka.jpg',
  },
  {
    name: 'Hambantota', province: 'Southern',
    description: 'A fast-developing southern district featuring Yala National Park — the highest leopard density on earth — plus Bundala Wetlands and pink flamingoes.',
    highlights: ['Yala National Park', 'Bundala National Park', 'Hambantota Port', 'Tissamaharama Raja Maha Vihara'],
    best_for: ['Safari', 'Wildlife', 'Nature', 'Bird watching'],
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Yala_National_Park_%28Sri_Lanka_2012%29.jpg/960px-Yala_National_Park_%28Sri_Lanka_2012%29.jpg',
  },
  // Northern Province
  {
    name: 'Jaffna', province: 'Northern',
    description: "The northern cultural heartland of Sri Lanka, famous for its unique Tamil heritage, ancient Hindu temples, island day trips and fresh seafood cuisine.",
    highlights: ['Jaffna Fort', 'Nainativu Island', 'Nallur Kandaswamy Temple', 'Jaffna Library'],
    best_for: ['Culture', 'Heritage', 'Temples', 'Cuisine'],
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/Jaffna_Fort_entrance.JPG/960px-Jaffna_Fort_entrance.JPG',
  },
  {
    name: 'Kilinochchi', province: 'Northern',
    description: 'A resilient district rebuilding post-conflict, known for its fertile agricultural flatlands, the iconic Water Tower and the vast Iranamadu Tank.',
    highlights: ['Iranamadu Tank', 'War Memorial Water Tower', 'Kilinochchi Market', 'Pooneryn Fort'],
    best_for: ['Cultural exploration', 'History', 'Off-the-beaten-path'],
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d6/Kilinochchi_water_tower.JPG/960px-Kilinochchi_water_tower.JPG',
  },
  {
    name: 'Mannar', province: 'Northern',
    description: "An island district connected by causeway, known for its ancient giant baobab trees, flamingo-filled sanctuaries and the mythical Adam's Bridge shoals.",
    highlights: ['Mannar Fort', 'Ancient Baobab Tree', "Adam's Bridge", "Giant's Tank Bird Sanctuary"],
    best_for: ['Bird watching', 'History', 'Off-the-beaten-path', 'Nature'],
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/Mannar_Fort.jpg/960px-Mannar_Fort.jpg',
  },
  {
    name: 'Vavuniya', province: 'Northern',
    description: 'A historic gateway to the north dotted with ancient stupas, peaceful irrigation tanks and the Maithreepala Sirisena peace monument.',
    highlights: ['Maithreepala Monument', 'Ularapokuna Tank', 'Vavuniya Museum', 'Pavatkulam Tank'],
    best_for: ['History', 'Peaceful getaway', 'Temples'],
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Vavuniya.JPG/960px-Vavuniya.JPG',
  },
  {
    name: 'Mullaitivu', province: 'Northern',
    description: "A northern coastal district with unspoiled beaches, serene lagoons and dense mangrove forests — one of Sri Lanka's most pristine natural frontiers.",
    highlights: ['Nandikadal Lagoon', 'Chalai Beach', 'Mullaitivu Beach', 'Mangrove Forests'],
    best_for: ['Nature', 'Off-the-beaten-path', 'Beach', 'Relaxation'],
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/6/6d/Mullaitivu_beach.jpg',
  },
  // Eastern Province
  {
    name: 'Trincomalee', province: 'Eastern',
    description: "Home to one of the world's finest natural harbours — Trincomalee offers pristine beaches, whale-shark snorkelling and majestic ancient Hindu temples.",
    highlights: ['Uppuveli & Nilaveli Beach', 'Koneswaram Temple', 'Pigeon Island Marine NP', 'Whale watching'],
    best_for: ['Beach', 'Diving', 'History', 'Whale watching'],
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/Trincomalee_beach_Sri_Lanka.jpg/960px-Trincomalee_beach_Sri_Lanka.jpg',
  },
  {
    name: 'Batticaloa', province: 'Eastern',
    description: 'The "Land of the Singing Fish" — a lagoon-laced coastal district with Dutch colonial forts, vibrant Tamil culture and the stunning Pasikudah Bay.',
    highlights: ['Batticaloa Fort', 'Kallady Bridge', 'Pasikudah Beach', 'Singing Fish Lagoon'],
    best_for: ['Beach', 'Lagoons', 'Culture', 'History'],
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/Pasikuda_Sri_Lanka.jpg/960px-Pasikuda_Sri_Lanka.jpg',
  },
  {
    name: 'Ampara', province: 'Eastern',
    description: 'A diverse district encompassing the world-class Arugam Bay surf breaks, the ancient Deegavapi stupa and lush Lahugala elephant sanctuary.',
    highlights: ['Arugam Bay', 'Lahugala National Park', 'Deegavapi Stupa', 'Kumana National Park'],
    best_for: ['Surfing', 'Wildlife', 'History', 'Adventure'],
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/Arugam_Bay_surf.jpg/960px-Arugam_Bay_surf.jpg',
  },
  // North Western Province
  {
    name: 'Kurunegala', province: 'North Western',
    description: 'The commercial hub of the North Western Province, surrounded by ancient reservoirs, cave temples and the bouldering Elephant Rock landmark.',
    highlights: ['Elephant Rock (Ethagala)', 'Ridi Vihara Temple', 'Kurunegala Lake', 'Aukana Buddha Statue'],
    best_for: ['History', 'Temples', 'Nature', 'Day trips'],
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Kurunegala-rock.JPG/960px-Kurunegala-rock.JPG',
  },
  {
    name: 'Puttalam', province: 'North Western',
    description: 'A coastal district famous for its shimmering salt flats, Wilpattu National Park — the largest national park in Sri Lanka — and the Kalpitiya kitesurfing strip.',
    highlights: ['Wilpattu National Park', 'Kalpitiya Peninsula', 'Salt Flats', 'Puttalam Lagoon'],
    best_for: ['Wildlife', 'Kitesurfing', 'Nature', 'Safari'],
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Wilpattu_National_Park.jpg/960px-Wilpattu_National_Park.jpg',
  },
  // North Central Province
  {
    name: 'Anuradhapura', province: 'North Central',
    description: "Sri Lanka's first ancient capital and a UNESCO World Heritage Site — a sacred city of colossal stupas, the Sri Maha Bodhi and royal palaces.",
    highlights: ['Sri Maha Bodhi', 'Ruwanwelisaya Stupa', 'Abhayagiri Monastery', 'Isurumuniya Vihara'],
    best_for: ['History', 'Pilgrimage', 'Archaeology', 'Culture'],
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/31/Anuradhapura_Ruwanwelisaya.jpg/960px-Anuradhapura_Ruwanwelisaya.jpg',
  },
  {
    name: 'Polonnaruwa', province: 'North Central',
    description: "Sri Lanka's medieval capital — a UNESCO city of magnificent standing Buddha statues, royal baths and well-preserved ruins spread across a vast tropical plain.",
    highlights: ['Gal Vihara', 'Parakrama Samudra', 'Royal Palace Ruins', 'Vatadage'],
    best_for: ['History', 'Cycling', 'Archaeology', 'Photography'],
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b1/Polonnaruwa_Vatadage.jpg/960px-Polonnaruwa_Vatadage.jpg',
  },
  // Uva Province
  {
    name: 'Badulla', province: 'Uva',
    description: "A stunning hill district home to Ella's iconic Nine Arch Bridge, the dramatic Rawana Falls, misty Ella Rock hiking and one of the world's most scenic train journeys.",
    highlights: ['Nine Arch Bridge (Ella)', 'Rawana Falls', 'Ella Rock Hike', 'Dunhinda Falls'],
    best_for: ['Hiking', 'Scenic train', 'Adventure', 'Photography'],
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/62/SL_Demodara_near_Ella_asv2020-01_img02.jpg/960px-SL_Demodara_near_Ella_asv2020-01_img02.jpg',
  },
  {
    name: 'Monaragala', province: 'Uva',
    description: 'An unspoiled province of forested highlands, the ancient colossal Maligawila Buddha statues, Buduruwagala rock carvings and the wide Wellawaya plains.',
    highlights: ['Maligawila Buddha Statue', 'Buduruwagala Rock Temple', 'Wellawaya Valley', 'Gal Oya NP'],
    best_for: ['Off-the-beaten-path', 'History', 'Nature', 'Temples'],
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Maligawila_Vihara_Buddha_Statue.jpg/960px-Maligawila_Vihara_Buddha_Statue.jpg',
  },
  // Sabaragamuwa Province
  {
    name: 'Ratnapura', province: 'Sabaragamuwa',
    description: "The \"City of Gems\" — Sri Lanka's gemstone capital set among lush rainforests, featuring the sacred Adam's Peak pilgrimage and the Sinharaja Biosphere Reserve.",
    highlights: ["Adam's Peak (Sri Pada)", 'Sinharaja Forest Reserve', 'Gemstone Mines', 'Ratnapura Gem Museum'],
    best_for: ['Hiking', 'Nature', 'Gems', 'Pilgrimage'],
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Adams_peak2.jpg/960px-Adams_peak2.jpg',
  },
  {
    name: 'Kegalle', province: 'Sabaragamuwa',
    description: 'A verdant hilly district famous for white-water rafting at Kitulgala, prehistoric Belilena Cave and the emerald Mawanella gem trade.',
    highlights: ['Kitulgala Rafting', 'Pinnawala (nearby)', 'Belilena Cave', 'Rambukkana'],
    best_for: ['Adventure', 'Rafting', 'Nature', 'Wildlife'],
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/25/Pinnawala_Elephant_Orphanage.jpg/960px-Pinnawala_Elephant_Orphanage.jpg',
  },
];

async function seed() {
  try {
    await sequelize.authenticate();
    console.log('DB connected\n');

    let created = 0, skipped = 0;
    for (const d of DISTRICTS) {
      const existing = await District.findOne({ where: { name: d.name } });
      if (existing) {
        console.log(`  –  Skipped  ${d.name} (already exists)`);
        skipped++;
      } else {
        await District.create(d);
        console.log(`  ✓  Created  ${d.name}`);
        created++;
      }
    }

    console.log(`\nDone — ${created} created, ${skipped} skipped.`);
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exit(1);
  }
}

seed();
