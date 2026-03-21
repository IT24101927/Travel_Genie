'use strict';
/**
 * Seed all 240 Sri Lankan destinations into the places table.
 * Maps district by name so IDs stay correct regardless of order.
 * Safe to run multiple times — skips rows that already exist (by name + district).
 *
 * Usage:  node utils/seedDestinations.js
 */

require('dotenv').config();
const { sequelize } = require('../config/database');
const Place = require('../modules/placeManagement/models/Place');
const District = require('../modules/placeManagement/models/District');

const DESTINATIONS_BY_DISTRICT = {
  'Colombo': [
    { name:'Gangaramaya Temple', type:'Temple', duration:'1–2 hrs', description:'A unique fusion of Sri Lankan, Thai, Indian and Chinese architecture housing a vast museum collection and sacred relics.' },
    { name:'Galle Face Green', type:'Park', duration:'1 hr', description:'A sweeping ocean-side promenade where kite-flyers mingle with street-food vendors against a backdrop of crashing waves.' },
    { name:'National Museum', type:'Museum', duration:'2 hrs', description:"Sri Lanka's largest museum containing royal regalia, ancient artefacts and the island's most prized historical collections." },
    { name:'Pettah Market', type:'Market', duration:'1–2 hrs', description:"Colombo's oldest and most chaotic bazaar — a sensory maze of spice stalls, fabric shops and Dutch-period mosques." },
    { name:'Independence Memorial Hall', type:'Heritage', duration:'45 min', description:"A proud neoclassical monument built to commemorate Ceylon's independence in 1948, flanked by golden lion sculptures." },
    { name:'Viharamahadevi Park', type:'Park', duration:'1 hr', description:"Colombo's oldest public park featuring shaded walkways, a golden Buddha statue and colourful seasonal flower beds." },
    { name:'Lotus Tower', type:'Viewpoint', duration:'1 hr', description:"South Asia's tallest self-supported structure with a revolving restaurant and observation deck offering 360° city views." },
    { name:'Mount Lavinia Beach', type:'Beach', duration:'2 hrs', description:'A famous colonial-era beach retreat just south of the city, known for its golden sands, seafood restaurants and sunset vibes.' },
    { name:'Kelaniya Raja Maha Vihara', type:'Temple', duration:'1.5 hrs', description:'A sacred temple believed to have been visited by the Buddha, famous for its reclining Buddha image and intricate paintings.' },
    { name:'One Galle Face Mall', type:'Shopping', duration:'2 hrs', description:"Colombo's premier luxury shopping and dining complex, perfect for escaping the heat and enjoying international brands." },
    { name:'Dutch Hospital Shopping Precinct', type:'Heritage', duration:'1.5 hrs', description:'A 17th-century Dutch hospital beautifully restored into a high-end complex of restaurants, cafes, and spas.' },
    { name:'Red Mosque (Jami Ul-Alfar)', type:'Heritage', duration:'30 min', description:"A striking red-and-white candy-striped mosque in Pettah, one of Colombo's most photographed architectural wonders." },
  ],
  'Gampaha': [
    { name:'Pinnawala Elephant Orphanage', type:'Wildlife', duration:'2–3 hrs', description:"Home to one of the world's largest herds of captive elephants — watch them bathe in the river twice daily." },
    { name:'Henarathgoda Botanical Garden', type:'Garden', duration:'1.5 hrs', description:"Sri Lanka's oldest botanical garden, where the first rubber tree in Asia was planted in 1876." },
    { name:'Attanagalla Rajamaha Viharaya', type:'Temple', duration:'45 min', description:'A revered ancient temple set against a scenic rock face, worshipped by devotees of all faiths for its healing powers.' },
    { name:'Bolgoda Lake', type:'Lake', duration:'2 hrs', description:"One of Sri Lanka's largest natural freshwater lakes, perfect for boat rides through bird-filled mangrove channels." },
    { name:'Seetha Eliya Dambulla', type:'Heritage', duration:'1 hr', description:'A scenic rural town known for its misty surroundings and proximity to ancient cave complexes.' },
    { name:'Kelaniya Water World', type:'Wildlife', duration:'1.5 hrs', description:"South Asia's first underwater tunnel aquarium and a riverside park with exotic birds and distinct aquatic life." },
    { name:'Horagolla National Park', type:'Nature', duration:'1 hr', description:'One of the smallest national parks, urban and biodiverse, protecting a patch of secondary lowland rain forest.' },
    { name:'Thewatte Basilica (Tewatta)', type:'Heritage', duration:'1 hr', description:'The Basilica of Our Lady of Lanka, a national shrine of the Catholic church with unique post-independence architecture.' },
    { name:'Negombo Beach', type:'Beach', duration:'2 hrs', description:'A popular wide sandy beach lined with hotels and restaurants, known for its fishing industry and vibrant nightlife.' },
    { name:'Angurukaramulla Temple', type:'Temple', duration:'45 min', description:'A colourful temple in Negombo featuring a 6-metre high Buddha statue and a dragon entrance.' },
  ],
  'Kalutara': [
    { name:'Kalutara Bodhiya', type:'Temple', duration:'45 min', description:'A hollow stupa containing a relic of the sacred Bo tree — one of the few stupas in the world that visitors can enter.' },
    { name:'Bentota River', type:'Nature', duration:'2 hrs', description:'A serene river lined with mangroves and water lilies, ideal for boat safaris spotting kingfishers, monitors and otters.' },
    { name:'Kalutara Beach', type:'Beach', duration:'2–3 hrs', description:'A long golden-sand beach popular with surfers and swimmers, framed by coconut palms and a lighthouse.' },
    { name:'Richmond Castle', type:'Heritage', duration:'1 hr', description:'A colonial-era mansion blending Italian and local architectural styles, once the residence of a Kandyan chieftain.' },
    { name:'Lunuganga Estate', type:'Garden', duration:'2 hrs', description:"Geoffrey Bawa's celebrated rural retreat — a landscape garden that inspired generations of tropical modernist design." },
    { name:'Beruwala Lighthouse', type:'Viewpoint', duration:'30 min', description:"Sri Lanka's oldest lighthouse standing on a rocky headland, offering panoramic views of the harbour and sea." },
    { name:'Brief Garden', type:'Garden', duration:'1.5 hrs', description:"The enchanting garden and home of Bevis Bawa, Geoffrey Bawa's brother, filled with sculptures and lush vegetation." },
    { name:'Fa Hien Cave', type:'Heritage', duration:'1 hr', description:'One of the largest natural caves in Asia, where prehistoric human skeletal remains dating back 37,000 years were found.' },
    { name:'Thudugala Ella Waterfall', type:'Nature', duration:'1 hr', description:'A picturesque waterfall located in a rubber estate, popular for bathing and surrounded by lush green foliage.' },
    { name:'Kande Viharaya', type:'Temple', duration:'1 hr', description:'Home to one of the tallest sitting Buddha statues in Sri Lanka, attracting devotees from all over the country.' },
  ],
  'Kandy': [
    { name:'Temple of the Tooth Relic', type:'Temple', duration:'2 hrs', description:'The most sacred Buddhist site in Sri Lanka, housing the tooth relic of the Buddha within a gilded casket.' },
    { name:'Kandy Lake', type:'Lake', duration:'1 hr', description:'A serene man-made lake in the heart of the city, perfect for an evening walk with views of the temple and hills.' },
    { name:'Peradeniya Botanical Gardens', type:'Garden', duration:'2–3 hrs', description:"One of Asia's finest botanical gardens with a spectacular avenue of royal palms and a 60-metre Java fig tree." },
    { name:'Bahirawakanda Buddha Statue', type:'Temple', duration:'45 min', description:'A colossal white statue perched atop a hill offering the best aerial views of the city of Kandy.' },
    { name:'Kandyan Cultural Show', type:'Culture', duration:'1.5 hrs', description:'A vibrant nightly performance of traditional Kandyan dance, fire-walking and acrobatics at the cultural centre.' },
    { name:'Udawatta Kele Sanctuary', type:'Nature', duration:'2 hrs', description:'A royal forest reserve just above the temple, harbouring giant squirrels, monkeys and rare endemic birds.' },
    { name:'Ceylon Tea Museum', type:'Museum', duration:'1.5 hrs', description:'Housed in the 1925 Hantana Tea Factory, this museum showcases vintage tea-processing machinery and history.' },
    { name:'Commonwealth War Cemetery', type:'Heritage', duration:'30 min', description:'A beautifully maintained and peaceful memorial ground for soldiers of the British Empire who died in WWII.' },
    { name:'Gadaladeniya Temple', type:'Temple', duration:'45 min', description:'A 14th-century temple with South Indian architectural influence, built on a rock outcrop with panoramic views.' },
    { name:'Lankatilaka Vihara', type:'Temple', duration:'45 min', description:'Considered the most magnificent architectural edifice created during the Gampola era, standing on a large rock.' },
    { name:'Embekke Devalaya', type:'Heritage', duration:'45 min', description:'Famous for its intricate wood carvings on every pillar, depicting wrestlers, dancers, musicians and mythical beasts.' },
  ],
  'Matale': [
    { name:'Nalanda Gedige', type:'Heritage', duration:'1 hr', description:'A 8th-century Hindu-Buddhist stone shrine — the only fully Mahayana Buddhist structure found in Sri Lanka.' },
    { name:'Aluvihara Rock Temple', type:'Temple', duration:'1.5 hrs', description:'An ancient cave temple where Buddhist scriptures were first committed to writing — murals vividly depict Buddhist concepts.' },
    { name:'Spice Garden Matale', type:'Garden', duration:'1 hr', description:'A working spice plantation where guides explain the cultivation of cinnamon, cloves, nutmeg and ayurvedic plants.' },
    { name:'Sri Muthumariamman Thevasthanam', type:'Temple', duration:'45 min', description:"Matale's celebrated Hindu temple renowned for its ornate gopuram tower richly adorned with painted deities." },
    { name:'Sigiriya Rock', type:'Heritage', duration:'3 hrs', description:'Just outside Matale — the iconic 5th-century lion rock citadel rising 200 m, with frescoes and mirror wall.' },
    { name:'Pidurangala Rock', type:'Nature', duration:'2 hrs', description:'A rock formation adjacent to Sigiriya offering a challenging hike and likely the best view of Sigiriya Rock itself.' },
    { name:'Sembuwatta Lake', type:'Lake', duration:'2 hrs', description:'A breathtaking man-made lake surrounded by tea plantations and pine forest, with swimming pool and huts.' },
    { name:'Riverston Gap', type:'Viewpoint', duration:'3 hrs', description:'Wait for the mist to clear at this windy gap in the Knuckles Mountain Range for spectacular views and trekking.' },
    { name:'Wasgamuwa National Park', type:'Safari', duration:'3 hrs', description:'A less crowded park known for its large herds of elephants, sloth bears, and diverse bird species.' },
    { name:'Dambulla Cave Temple', type:'Temple', duration:'1.5 hrs', description:'The largest and best-preserved cave temple complex in Sri Lanka, a UNESCO World Heritage Site with 153 Buddha statues.' },
  ],
  'Nuwara Eliya': [
    { name:"Horton Plains & World's End", type:'Nature', duration:'4–5 hrs', description:'A dramatic highland plateau ending at a 870 m precipice — an unmissable dawn hike through montane cloud forest.' },
    { name:'Gregory Lake', type:'Lake', duration:'1–2 hrs', description:'A picturesque reservoir allowing pedal-boating, horse riding and lakeside picnics in the cool mountain air.' },
    { name:'Hakgala Botanical Garden', type:'Garden', duration:'2 hrs', description:'A terraced garden at 1,745 m altitude famous for its rose collection, tree ferns and mist-shrouded rockery.' },
    { name:'Pedro Tea Estate', type:'Heritage', duration:'1.5 hrs', description:'One of the oldest working tea factories in Sri Lanka offering guided tours through withering rooms and rolling machines.' },
    { name:'Seetha Amman Temple', type:'Temple', duration:'45 min', description:'A colourful Hindu shrine marking the site where, according to Ramayana lore, Sita was held captive.' },
    { name:'Moon Plains', type:'Viewpoint', duration:'2 hrs', description:'A windswept highland plateau at 1,990 m with sweeping 360° views across the hill country and tea valleys.' },
    { name:'Victoria Park', type:'Park', duration:'1 hr', description:'A beautifully manicured park in the town centre, perfect for a stroll and famous for its rare bird species.' },
    { name:"St. Clair's Falls", type:'Nature', duration:'30 min', description:'"Known as the Little Niagara of Sri Lanka", this is one of the widest waterfalls in the country.' },
    { name:'Devon Falls', type:'Nature', duration:'30 min', description:'A stunning waterfall viewed from a dedicated viewing platform, named after a pioneer English coffee planter.' },
    { name:'Strawberry Fields', type:'Nature', duration:'45 min', description:'Visit a strawberry farm to pick fresh strawberries and enjoy strawberry pancakes and milkshakes.' },
    { name:'Ambewela Farm', type:'Nature', duration:'1.5 hrs', description:'"Often called Little New Zealand", a dairy farm with grazing cows, wind turbines and rolling green pastures.' },
  ],
  'Galle': [
    { name:'Galle Fort', type:'Heritage', duration:'2–3 hrs', description:'A UNESCO-listed 17th-century Dutch fortification enclosing cobblestone streets, boutiques, cafés and ocean bastions.' },
    { name:'Galle Lighthouse', type:'Viewpoint', duration:'30 min', description:'The oldest lighthouse in Sri Lanka standing within the fort walls, offering panoramic views of the Indian Ocean.' },
    { name:'National Maritime Museum', type:'Museum', duration:'1.5 hrs', description:"Housed in a Dutch-era warehouse, it showcases Sri Lanka's rich seafaring heritage, coral ecosystems and ancient anchors." },
    { name:'Jungle Beach (Unawatuna)', type:'Beach', duration:'3 hrs', description:'A calm sheltered bay just east of the fort — ideal for snorkelling over colourful reef teeming with tropical fish.' },
    { name:'Historical Mansion Museum', type:'Museum', duration:'1 hr', description:'A restored colonial house displaying antique furniture, vintage cameras, gems and porcelain from the Dutch period.' },
    { name:'Dutch Reformed Church', type:'Heritage', duration:'30 min', description:"One of Asia's oldest Protestant churches, with original wooden pews and gravestones dating back to 1640." },
    { name:'Unawatuna Beach', type:'Beach', duration:'2 hrs', description:'A popular banana-shaped beach with calm waters, plenty of restaurants, and vibrant nightlife.' },
    { name:'Koggala Lake', type:'Lake', duration:'2 hrs', description:'Take a boat trip to Cinnamon Island and Temple Island, and see traditional stilt fishermen nearby.' },
    { name:'Japanese Peace Pagoda', type:'Viewpoint', duration:'45 min', description:'A white stupa located on Rumassala Hill offering peaceful vibes and stunning views of Galle Bay and the Fort.' },
    { name:'Sea Turtle Hatchery', type:'Wildlife', duration:'1 hr', description:'Conservation centers in Habaraduwa and Koggala caring for injured turtles and hatching eggs for release.' },
  ],
  'Matara': [
    { name:'Mirissa Beach', type:'Beach', duration:'Half day', description:'A crescent-shaped bay anchored by Parrot Rock, famous worldwide for whale-watching boat trips from November to April.' },
    { name:'Star Fort Matara', type:'Heritage', duration:'1 hr', description:'A small but perfectly preserved 18th-century Dutch fort — its star-shaped ramparts enclose a tiny island within a moat.' },
    { name:'Paravi Duwa Temple', type:'Temple', duration:'45 min', description:'A small Buddhist temple on a tidal island connected to the mainland by a footbridge, especially atmospheric at dusk.' },
    { name:'Dondra Head Lighthouse', type:'Viewpoint', duration:'30 min', description:'The southernmost lighthouse in Sri Lanka and one of the tallest on the island — the very tip of the subcontinent.' },
    { name:'Polhena Reef', type:'Nature', duration:'2 hrs', description:'A shallow protected reef where snorkellers swim alongside sea turtles year-round in calm, clear water.' },
    { name:'Wella Dewalaya', type:'Temple', duration:'45 min', description:'An ancient Hindu shrine dedicated to the god Kataragama, beautifully situated on the banks of the Nilwala Ganga.' },
    { name:'Snake Farm', type:'Wildlife', duration:'1 hr', description:'A unique, albeit rustic, center in Weligama allowing supervised interaction with indigenous snakes.' },
    { name:'Coconut Tree Hill', type:'Viewpoint', duration:'45 min', description:'A private coconut estate on a high cliff in Mirissa, now a famous Instagram spot for its ocean backdrop.' },
    { name:'Secret Beach Mirissa', type:'Beach', duration:'2 hrs', description:'A tucked-away cove accessible by a steep path, offering a quieter alternative to the main beach.' },
    { name:'Weherahena Temple', type:'Temple', duration:'1 hr', description:'An underground temple tunnel complex adorned with Jataka story paintings, leading to a colossal Buddha statue.' },
  ],
  'Hambantota': [
    { name:'Yala National Park', type:'Safari', duration:'Half day', description:"Sri Lanka's most visited park — roam its scrub forests for leopards, sloth bears, crocodiles and herds of wild elephants." },
    { name:'Bundala National Park', type:'Safari', duration:'3 hrs', description:'A Ramsar Wetland Reserve drawing over 200 bird species; flamingo flocks are the star attraction from November to March.' },
    { name:'Tissamaharama Stupa', type:'Temple', duration:'1 hr', description:"One of Sri Lanka's greatest ancient stupas, built by King Kavantissa — gleaming white against the blue Tissa Wewa tank." },
    { name:'Kataragama Dewalaya', type:'Temple', duration:'1 hr', description:'A multi-faith sacred complex revered by Buddhists, Hindus and Muslims — centre of the grand Kataragama festival.' },
    { name:'Rekawa Turtle Conservation', type:'Wildlife', duration:'2–3 hrs', description:"Nightly guided visits to a protected beach where five species of turtle nest — one of south Asia's finest turtle sites." },
    { name:'Mulkirigala Rock Temple', type:'Temple', duration:'1.5 hrs', description:'A dramatic series of cave temples perched on a 210 m rock, adorned with ancient cave paintings and reclining Buddhas.' },
    { name:'Birds Park Hambantota', type:'Wildlife', duration:'2 hrs', description:'A research centre and park housing exotic birds, dedicated to conservation and education.' },
    { name:'Ridiyagama Safari Park', type:'Safari', duration:'2 hrs', description:"Sri Lanka's first open-air zoo where lions, tigers and herbivores roam freely while visitors tour in protected buses." },
    { name:'Madunagala Hot Springs', type:'Nature', duration:'1 hr', description:'Natural thermal springs surrounded by paddy fields, renovated with bathing tanks for visitors.' },
    { name:'Ussangoda National Park', type:'Nature', duration:'1 hr', description:'A mysterious plateau with red soil and stunted vegetation, linked to the Ramayana legend of King Ravana.' },
  ],
  'Jaffna': [
    { name:'Jaffna Fort', type:'Heritage', duration:'1.5 hrs', description:'A massive Portuguese-built, Dutch-expanded fort enclosing a lighthouse overlooking the crystal-clear Jaffna Lagoon.' },
    { name:'Nallur Kandaswamy Kovil', type:'Temple', duration:'1 hr', description:"Jaffna's most important Hindu temple with a soaring golden gopuram, famous for the 25-day annual Nallur Festival." },
    { name:'Nainativu Island', type:'Heritage', duration:'Half day', description:'A pilgrimage island reached by boat, housing both the Naganadha Buddhist temple and the revered Nainativu Amman Kovil.' },
    { name:'Jaffna Public Library', type:'Heritage', duration:'45 min', description:'Rebuilt after its tragic burning — a neo-Dravidian landmark and symbol of Tamil culture, knowledge and resilience.' },
    { name:'Casuarina Beach', type:'Beach', duration:'2 hrs', description:'A quiet northern beach lined with casuarina trees, shallow turquoise water and spectacular sunset views.' },
    { name:'Keerimalai Hot Springs', type:'Nature', duration:'1 hr', description:'Natural saltwater springs beside the sea, believed since ancient times to have medicinal properties.' },
    { name:'Delft Island', type:'Nature', duration:'Half day', description:'A remote island with wild ponies, Dutch fort ruins, and a giant baobab tree, offering a glimpse of a different time.' },
    { name:'Dambakola Patuna', type:'Temple', duration:'1 hr', description:'The ancient port where Sanghamitta Theri landed with the sacred Bo sapling, now marked by a white temple.' },
    { name:'Point Pedro', type:'Viewpoint', duration:'30 min', description:'The northernmost point of Sri Lanka, marked by a sign and a lighthouse, with a vast open sea ahead.' },
    { name:'Rio Ice Cream', type:'Culture', duration:'30 min', description:'A legendary local ice cream parlour in Jaffna known for its sugary, colourful, and nostalgic sundaes.' },
  ],
  'Kilinochchi': [
    { name:'Iranamadu Tank', type:'Lake', duration:'1.5 hrs', description:'One of the largest irrigation reservoirs in the north, fringed by birdlife and providing a peaceful scenic escape.' },
    { name:'War Memorial Water Tower', type:'Heritage', duration:'30 min', description:'An iconic symbol of Kilinochchi — a water tower blasted from its base, now preserved as a war memorial.' },
    { name:'Pooneryn Fort', type:'Heritage', duration:'1 hr', description:'A centuries-old Portuguese coastal fort offering views across the Jaffna Lagoon from its crumbling walls.' },
    { name:'Aadampan Bird Sanctuary', type:'Wildlife', duration:'2 hrs', description:'A tranquil wetland sanctuary drawing migratory wading birds including painted storks and open-bill storks.' },
    { name:'Kilinochchi Town Market', type:'Market', duration:'1 hr', description:'A lively local market reflecting the resilience and everyday life of the post-war northern community.' },
    { name:'Lubai Nagar Mosque', type:'Heritage', duration:'30 min', description:'A significant mosque in the area, serving as a community hub and architectural landmark.' },
    { name:"Devil's Point", type:'Viewpoint', duration:'1 hr', description:'A remote promontory sticking out into the Palk Bay, offering solitude and wild coastal views.' },
  ],
  'Mannar': [
    { name:'Mannar Fort', type:'Heritage', duration:'1.5 hrs', description:'A Portuguese-built coastal fort expanded by the Dutch, still enclosing an old church and garrison buildings.' },
    { name:'Ancient Baobab Tree', type:'Nature', duration:'30 min', description:'A 700-year-old African baobab tree — the oldest in Asia, said to have been planted by Arab traders.' },
    { name:"Adam's Bridge (Rama's Bridge)", type:'Heritage', duration:'2 hrs', description:'A chain of limestone shoals connecting Sri Lanka to India, held sacred in both Hindu and local Buddhist traditions.' },
    { name:"Giant's Tank & Bird Sanctuary", type:'Wildlife', duration:'2 hrs', description:'A vast ancient reservoir attracting painted storks, pelicans and spot-billed pelicans during migratory season.' },
    { name:'Talaimannar Pier', type:'Viewpoint', duration:'1 hr', description:'The westernmost tip of Sri Lanka, from where ferries once crossed to India and where sunsets paint the sky gold.' },
    { name:'Thiruketheeswaram Kovil', type:'Temple', duration:'1 hr', description:'One of the five ancient ishwarams dedicated to Lord Shiva, a major pilgrimage site with a large tank.' },
    { name:'Doric House', type:'Heritage', duration:'45 min', description:'The ruins of the former residence of the first British Governor of Ceylon, located on a cliff edge.' },
    { name:'Mannar Bird Sanctuary', type:'Wildlife', duration:'2 hrs', description:'Famous for the annual migration of flamingos and other waders, creating a pink spectacle in the shallow waters.' },
  ],
  'Mullaitivu': [
    { name:'Mullaitivu Beach', type:'Beach', duration:'2 hrs', description:"A vast untouched coastline with powder-white sand and crystal water — one of the quietest beaches in Sri Lanka." },
    { name:'Nandikadal Lagoon', type:'Nature', duration:'2 hrs', description:'A large brackish lagoon of immense natural and historical significance, now returning to a state of serene beauty.' },
    { name:'Chalai Beach', type:'Beach', duration:'2 hrs', description:'A pristine, largely undisturbed beach backed by casuarina groves — ideal for solitude seekers.' },
    { name:'Mangrove Canoe Tours', type:'Nature', duration:'2–3 hrs', description:'Paddle through dense mangrove channels teeming with kingfishers, mudskippers and sea eagles.' },
    { name:'Putumattalan Memorial', type:'Heritage', duration:'45 min', description:"A significant post-war commemorative site marking the area's history and journey toward peace and reconciliation." },
    { name:'Kokkilai Bird Sanctuary', type:'Wildlife', duration:'2 hrs', description:'A coastal sanctuary rich in mangroves and sea grass beds, hosting large flocks of migratory birds.' },
    { name:'Red Barna Golf Club', type:'Adventure', duration:'2 hrs', description:'A sandy, coastal golf course maintained by the military, offering a unique sporting experience.' },
  ],
  'Vavuniya': [
    { name:'Kandasamy Kovil', type:'Temple', duration:'45 min', description:'A colourful and ornate Hindu temple which is one of the most significant religious sites in Vavuniya.' },
    { name:'Madhu Church', type:'Heritage', duration:'1 hr', description:'The most venerated Catholic shrine in Sri Lanka, drawing hundreds of thousands of pilgrims each year from all faiths.' },
    { name:'Ularapokuna Tank', type:'Lake', duration:'1 hr', description:'An ancient reservoir ringed by forested hills and rich birdlife — ideal for a peaceful morning boat trip.' },
    { name:'Vavuniya Museum', type:'Museum', duration:'1.5 hrs', description:"Documenting the district's rich archaeological heritage across thousands of years of continuous settlement." },
    { name:'Cheddikulam Bird Sanctuary', type:'Wildlife', duration:'2 hrs', description:'A lush forest reserve surrounding a tank, sheltering endemic dry-zone birds and small mammals.' },
    { name:'Grand Jummah Mosque', type:'Heritage', duration:'30 min', description:'A beautiful mosque in the heart of Vavuniya town, reflecting the diverse culture of the region.' },
    { name:'Iratperiyakulam Tank', type:'Lake', duration:'1 hr', description:'A scenic spot for a stopover, with a bathing enclosure and ancient ruins nearby.' },
  ],
  'Trincomalee': [
    { name:'Koneswaram Temple', type:'Temple', duration:'1 hr', description:'A magnificent clifftop Hindu temple dedicated to Lord Shiva, with the sea crashing 130 m below its foundations.' },
    { name:'Nilaveli Beach', type:'Beach', duration:'Half day', description:'Among the most beautiful beaches in Asia — a 15 km strip of powder-white sand and shallow turquoise sea.' },
    { name:'Pigeon Island Marine NP', type:'Nature', duration:'3 hrs', description:'A pristine coral reef teeming with blacktip reef sharks, parrotfish, clownfish and spectacular staghorn coral.' },
    { name:'Hot Springs (Kanniya)', type:'Nature', duration:'1 hr', description:'Seven natural springs of varying temperatures rising from the earth, believed to have been created by Ravana.' },
    { name:'Fort Frederick', type:'Heritage', duration:'1 hr', description:'A Portuguese-Dutch fort on a peninsula, home to a herd of semi-wild spotted deer strolling its grassy ramparts.' },
    { name:'Whale Watching', type:'Wildlife', duration:'4 hrs', description:'Blue whales, sperm whales and pods of spinner dolphins visit from March to August off the Trincomalee coast.' },
    { name:'Marble Beach', type:'Beach', duration:'2 hrs', description:'A hidden gem handled by the air force, known for its extremely calm, marble-like surface and clear waters.' },
    { name:'Gokana Temple', type:'Temple', duration:'30 min', description:'A Buddhist temple inside Fort Frederick offering a stunning vantage point over the Trincomalee Harbour.' },
    { name:'Naval Museum', type:'Museum', duration:'1.5 hrs', description:'Located at the Hoods Tower Naval Base, displaying naval guns, artifacts and history of the port.' },
    { name:'Seruwila Mangala Raja Maha Vihara', type:'Temple', duration:'1 hr', description:'An ancient stupa built by King Kavantissa containing the forehead bone relic of the Buddha.' },
  ],
  'Batticaloa': [
    { name:'Batticaloa Fort', type:'Heritage', duration:'1 hr', description:"A well-preserved Dutch-era fort on a small island encircled by a lagoon — the best colonial fort in eastern Sri Lanka." },
    { name:'Pasikudah Bay', type:'Beach', duration:'Half day', description:"A world-famous shallow crescent bay where you can wade 700 m out to sea — one of the world's safest swimming beaches." },
    { name:'Singing Fish Lagoon', type:'Nature', duration:'2 hrs', description:'A magical phenomenon where fish vibrate to produce musical tones from the lagoon on moonlit nights.' },
    { name:'Kallady Bridge', type:'Viewpoint', duration:'30 min', description:'The longest bridge in Sri Lanka crossing the Batticaloa Lagoon — a superb spot to watch the colourful evening sky.' },
    { name:'Kalkudah Beach', type:'Beach', duration:'3 hrs', description:'An arc of golden sand backed by casuarina trees and calm azure water — a quieter alternative to Pasikudah.' },
    { name:'Batticaloa Lighthouse', type:'Heritage', duration:'30 min', description:'A historic lighthouse built in 1913, offering scenic views of the park and lagoon estuary nearby.' },
    { name:'Batticaloa Gate', type:'Heritage', duration:'30 min', description:'A monument marking the landing site of the first Methodist missionaries, located in Gandhi Park.' },
    { name:'Amritagali Mamangam Kovil', type:'Temple', duration:'45 min', description:'A revered Hindu temple believed to be built on a spot where Lord Rama worshipped Shiva.' },
  ],
  'Ampara': [
    { name:'Arugam Bay', type:'Beach', duration:'Half day', description:'A globally ranked right-hand point break surfing destination with a laid-back village atmosphere and wildlife nearby.' },
    { name:'Kumana National Park', type:'Safari', duration:'Half day', description:'A vast birding paradise with storks, herons and ibis nesting in the lagoon, plus elephants and leopards in the scrub.' },
    { name:'Lahugala Elephant Sanctuary', type:'Wildlife', duration:'2 hrs', description:'A small but densely populated reserve — one of the best places in Sri Lanka to see large elephant herds at close range.' },
    { name:'Deegavapi Stupa', type:'Heritage', duration:'1 hr', description:'An ancient stupa enshrining a sacred relic of the Buddha, one of the most revered pilgrimage sites in the east.' },
    { name:'Crocodile Rock (Arugam Bay)', type:'Viewpoint', duration:'1.5 hrs', description:'A scenic headland dotted with sunbathing crocs and roosting birds, reached by a short jungle walk.' },
    { name:'Muhudu Maha Vihara', type:'Heritage', duration:'45 min', description:'Beachside ruins of an ancient temple marking the landing place of Queen Viharamahadevi.' },
    { name:'Whisky Point', type:'Beach', duration:'2 hrs', description:'A popular surf break north of Arugam Bay with reliable waves and a fun, party atmosphere.' },
    { name:'Panama Tank', type:'Nature', duration:'1 hr', description:'A scenic reservoir near the coast where you can spot crocodiles and elephants in the evening.' },
    { name:'Buddhangala Monastery', type:'Temple', duration:'1 hr', description:'A forest hermitage dating back to the 2nd century BC, situated on a rock with panoramic jungle views.' },
  ],
  'Kurunegala': [
    { name:'Ethagala (Elephant Rock)', type:'Viewpoint', duration:'1 hr', description:'An enormous granite boulder shaped like a crouching elephant, scalable for panoramic views of the city and plains.' },
    { name:'Ridi Vihara', type:'Temple', duration:'1.5 hrs', description:'A cave temple famous for its silver-ore-encrusted shrine room, fine Kandyan murals and ancient moonstone.' },
    { name:'Aukana Buddha Statue', type:'Heritage', duration:'1 hr', description:'A magnificent 5th-century standing Buddha carved from a single granite rock, standing 12 m tall in a forest clearing.' },
    { name:'Padeniya Raja Maha Vihara', type:'Temple', duration:'1 hr', description:'A medieval gem of Kandyan-era temple architecture with exquisitely carved wooden pillars and a moonstoned entrance.' },
    { name:'Kurunegala Lake', type:'Lake', duration:'1 hr', description:"A beautiful man-made tank at the heart of the city, flanked by the rock hills and the town's colonial clock tower." },
    { name:'Yapahuwa Rock Fortress', type:'Heritage', duration:'2 hrs', description:'A short-lived medieval capital built on a sheer rock, famous for its ornate stone staircase and lion sculptures.' },
    { name:'Panduwasnuwara ruins', type:'Heritage', duration:'1.5 hrs', description:'Ruins of an ancient capital city featuring a citadel, palace, monasteries, and a reservoir.' },
    { name:'Arankele Forest Monastery', type:'Nature', duration:'1.5 hrs', description:'A serene 6th-century forest hermitage with hot water baths and meditation pathways under a canopy of ironwood trees.' },
  ],
  'Puttalam': [
    { name:'Wilpattu National Park', type:'Safari', duration:'Half day', description:"Sri Lanka's largest national park, with a network of natural water-filled lakes (villus) beloved by leopards and sloth bears." },
    { name:'Kalpitiya Peninsula', type:'Beach', duration:'2–3 hrs', description:'A pristine sandbar strip with world-class kitesurfing conditions from May to October and dolphin watching year-round.' },
    { name:'Puttalam Lagoon', type:'Nature', duration:'2 hrs', description:'A vast shallow lagoon dotted with mangrove islets, home to flamingoes and colourful migratory wading birds.' },
    { name:'Salt Flats of Puttalam', type:'Nature', duration:'1 hr', description:'Shimmering pink-white salt pans that glow vivid magenta at dawn — a surreal and photogenic landscape.' },
    { name:'Dutch Fort Kalpitiya', type:'Heritage', duration:'1 hr', description:"A small but well-preserved Portuguese-Dutch coastal fort overlooking the sea — the oldest fort in Sri Lanka's north west." },
    { name:'Munneswaram Temple', type:'Temple', duration:'1 hr', description:'A major Hindu temple complex dedicated to Shiva, one of the five ancient Ishwarams of Sri Lanka.' },
    { name:"St. Anne's Church, Talawila", type:'Heritage', duration:'1 hr', description:'A famous Catholic pilgrimage site located on a sandy spit of land, hosting massive festivals.' },
    { name:'Norochcholai Coal Power Plant', type:'Viewpoint', duration:'30 min', description:"View the massive cooling towers and infrastructure of Sri Lanka's first coal power plant from the outside." },
    { name:'Anawilundawa Bird Sanctuary', type:'Wildlife', duration:'2 hrs', description:'A RAMSAR wetland with a system of tanks offering a haven for resident and migratory birds.' },
  ],
  'Anuradhapura': [
    { name:'Sri Maha Bodhi', type:'Temple', duration:'1.5 hrs', description:'The most sacred tree on earth — a 2,300-year-old fig tree grown from a cutting of the original tree under which Buddha attained enlightenment.' },
    { name:'Ruwanwelisaya Stupa', type:'Heritage', duration:'1 hr', description:'A colossal white stupa 91 m tall built by King Dutugamunu, radiating a serene peace across the ancient city.' },
    { name:'Abhayagiri Monastery', type:'Heritage', duration:'2 hrs', description:'A vast monastic complex that once hosted 5,000 monks — wander its stupas, moonstones and meditation ponds.' },
    { name:'Isurumuniya Vihara', type:'Temple', duration:'1 hr', description:"A rock cave temple famous for the Isurumuniya Lovers — a 6th-century bas-relief of India's finest ancient sculptures." },
    { name:'Mihintale', type:'Heritage', duration:'2 hrs', description:'The birthplace of Buddhism in Sri Lanka — climb 1,840 granite steps to the summit where Mahinda met King Devanampiya Tissa.' },
    { name:'Thuparama Stupa', type:'Heritage', duration:'45 min', description:'The oldest domed stupa in Sri Lanka, built in the 3rd century BC to enshrine the right collarbone relic of the Buddha.' },
    { name:'Lovamahapaya', type:'Heritage', duration:'30 min', description:'"The Brazen Palace", once a 9-storey building with a bronze roof, now a sea of 1,600 stone pillars.' },
    { name:'Jetavanaramaya', type:'Heritage', duration:'1 hr', description:'Once the third tallest structure in the world after the Giza pyramids, this massive brick stupa is an engineering marvel.' },
    { name:'Kuttam Pokuna (Twin Ponds)', type:'Heritage', duration:'45 min', description:'Beautifully restored ancient bathing pools that demonstrate the sophisticated hydrology of the Anuradhapura era.' },
    { name:'Moonstone (Sandakada Pahana)', type:'Heritage', duration:'30 min', description:"Admire the most exquisitely carved semi-circular stone doorstep found at the Queen's Palace." },
  ],
  'Polonnaruwa': [
    { name:'Gal Vihara', type:'Heritage', duration:'1.5 hrs', description:'Four magnificent rock-cut Buddha figures — the 15 m reclining Parinirvana is considered the pinnacle of Sinhalese artistry.' },
    { name:'Parakrama Samudra', type:'Lake', duration:'1 hr', description:'A vast medieval sea-like reservoir built by King Parakramabahu I — still irrigating thousands of acres today.' },
    { name:'Royal Palace of Parakramabahu', type:'Heritage', duration:'1.5 hrs', description:'The ruins of a 7-storey palace with 1,000 rooms, surrounded by bathing pools and audience halls of cut stone.' },
    { name:'Vatadage', type:'Heritage', duration:'45 min', description:'A circular relic house protecting the oldest stupa in Polonnaruwa — stunning moonstones face each cardinal direction.' },
    { name:'Lankathilaka Image House', type:'Heritage', duration:'1 hr', description:'A 13th-century shrine with an imposing 18 m standing headless Buddha rising from brick ruins against the sky.' },
    { name:'Minneriya National Park', type:'Safari', duration:'3 hrs', description:"Home to The Gathering — the world's largest elephant congregation, with 400+ elephants assembling each July–October." },
    { name:'Somawathiya Chaitya', type:'Temple', duration:'1.5 hrs', description:'An ancient stupa deep in the jungle believed to house the right tooth relic of the Buddha.' },
    { name:'Rankoth Vehera', type:'Heritage', duration:'45 min', description:"The largest stupa in Polonnaruwa, mimicking the colossal style of Anuradhapura's monuments." },
    { name:'Kaudulla National Park', type:'Safari', duration:'3 hrs', description:'A key elephant corridor park centered around an ancient tank, offering excellent wildlife viewing.' },
    { name:'Pothgul Vihara', type:'Heritage', duration:'45 min', description:'"The Library Monastery", featuring a unique statue believed to be King Parakramabahu holding a palm leaf book.' },
  ],
  'Badulla': [
    { name:'Nine Arch Bridge, Ella', type:'Heritage', duration:'2 hrs', description:'An iconic colonial-era stone viaduct built without steel or cement — watching a blue train cross it is unforgettable.' },
    { name:'Ella Rock Hike', type:'Nature', duration:'4 hrs', description:'A full-morning hike through tea estates to a summit commanding a sea-of-clouds view across the southern hill country.' },
    { name:'Rawana Falls', type:'Nature', duration:'1 hr', description:'A 25 m wide cascading curtain falls — one of the widest waterfalls in Sri Lanka, easily visible from the main road.' },
    { name:"Little Adam's Peak", type:'Viewpoint', duration:'2 hrs', description:"A beginner-friendly hike through a tea plantation ending in a 360° panorama nearly identical to Adam's Peak." },
    { name:'Dunhinda Falls', type:'Nature', duration:'1.5 hrs', description:'A thundering 63 m plunge fall reached by a jungle trail — spray from its mist creates perpetual rainbows.' },
    { name:'Demodara Train Loop', type:'Heritage', duration:'1 hr', description:'A remarkable feat of engineering where the train spirals underground and resurfaces above where it just passed.' },
    { name:'Muthiyangana Raja Maha Vihara', type:'Temple', duration:'1 hr', description:'An ancient temple in Badulla town, one of the 16 sacred places (Solosmasthana) visited by Buddha.' },
    { name:"Lipton's Seat", type:'Viewpoint', duration:'2 hrs', description:"Sir Thomas Lipton's favorite view point, offering a dazzling panorama of tea estates across 7 districts." },
    { name:'Adisham Bungalow', type:'Heritage', duration:'1 hr', description:'A Benedictine monastery housed in a distinctively English country cottage-style granite mansion in Haputale.' },
    { name:'Diyaluma Falls', type:'Nature', duration:'2 hrs', description:'The second highest waterfall in Sri Lanka, with natural infinity pools at the top for brave swimmers.' },
  ],
  'Monaragala': [
    { name:'Maligawila Buddha Statue', type:'Heritage', duration:'1.5 hrs', description:"A stunning 11 m 7th-century standing Buddha carved from a single dolomite stone — the tallest ancient stone statue in Sri Lanka." },
    { name:'Buduruwagala Rock Temple', type:'Heritage', duration:'1.5 hrs', description:'Seven giant 9th-century Mahayana Buddhist rock reliefs carved into a jungle cliff — a hidden masterpiece of the ancient world.' },
    { name:'Gal Oya National Park', type:'Safari', duration:'Half day', description:'The only boat safari in Sri Lanka — glide silently past bathing elephants swimming between islands in a vast reservoir.' },
    { name:'Wellawaya Valley', type:'Viewpoint', duration:'2 hrs', description:'A scenic lowland plain framed by rock outcrops and paddy fields — an exceptional viewpoint on the Ella-Hambantota road pass.' },
    { name:'Inginiyagala Dam', type:'Nature', duration:'1 hr', description:'A large earth dam and reservoir forming the centrepiece of an important irrigation and birding area.' },
    { name:'Yudaganawa Stupa', type:'Heritage', duration:'45 min', description:'One of the largest stupas in the country, with unique architecture, located near Buttala.' },
    { name:'Maduru Oya National Park', type:'Safari', duration:'3 hrs', description:'Famous for its elephant herds and the ancient sluice gate discovered there dating back to the Anuradhapura period.' },
    { name:'Nilgala Forest Reserve', type:'Nature', duration:'2 hrs', description:'A medicinal plant forest and savanna known for its medicinal herbs and as a butterfly hotspot.' },
  ],
  'Ratnapura': [
    { name:"Adam's Peak (Sri Pada)", type:'Heritage', duration:'5–6 hrs', description:'A pre-dawn pilgrimage hike of 5,500 steps to a summit sacred to four religions — rewarded with a sunrise above the clouds.' },
    { name:'Sinharaja Forest Reserve', type:'Nature', duration:'Half day', description:"A UNESCO Biosphere Reserve and the last viable primary rainforest in Sri Lanka — a birdwatcher's paradise with 21 endemic species." },
    { name:'Ratnapura Gem Museum', type:'Museum', duration:'1.5 hrs', description:"Discover Sri Lanka's centuries-old gem industry — blue sapphires, cat's eyes and rubies all mined from these red soils." },
    { name:'Maha Saman Devalaya', type:'Temple', duration:'1 hr', description:'The principal shrine of Saman — a guardian deity of Sri Lanka — situated in a lush river valley near Ratnapura town.' },
    { name:'Bopath Falls', type:'Nature', duration:'1 hr', description:'A 30 m waterfall that fans into a Bo-leaf shape as it tumbles — one of the most photographed falls in Sri Lanka.' },
    { name:'Udawalawe National Park', type:'Safari', duration:'3 hrs', description:'The best park for guaranteed elephant sightings year-round, along with water buffalo, sambar deer and crocodiles.' },
    { name:'Batadombalena', type:'Heritage', duration:'1.5 hrs', description:"An archaeological cave site yielding Balangoda Man fossils, shedding light on prehistoric humans in Sri Lanka." },
    { name:'Pahanthudawa Falls', type:'Nature', duration:'1 hr', description:'A uniquely shaped waterfall creating a deep pool, resembling the wick of a traditional oil lamp.' },
    { name:'Waulpane Limestone Cave', type:'Adventure', duration:'2 hrs', description:'"Known as the Cave of Bats", this 500m long cave contains a waterfall inside and millions of bats.' },
  ],
  'Kegalle': [
    { name:'White Water Rafting, Kitulgala', type:'Adventure', duration:'3 hrs', description:"Sri Lanka's premier rafting destination on the Kelani River — grade 3–4 rapids through jungle gorges (October–April)." },
    { name:'Belilena Cave', type:'Heritage', duration:'1.5 hrs', description:'A prehistoric cave shelter containing evidence of human habitation going back 37,000 years, with an on-site museum.' },
    { name:'Bridge on the River Kwai Site', type:'Heritage', duration:'1 hr', description:"David Lean's 1957 Oscar-winning film was shot on the Kelani River near Kitulgala — the original bridge is gone but the river is stunning." },
    { name:'Rambukkana', type:'Heritage', duration:'1 hr', description:'Famous for its steep railway incline; watch the steam engine helpers push carriages up the dramatic Kadugannawa Pass.' },
    { name:'Ambuluwawa Tower', type:'Viewpoint', duration:'2 hrs', description:'A multi-religious tower atop a 1,021 m biodiversity complex, visible from Kandy and offering spectacular views.' },
    { name:'Pinnawala Open Zoo', type:'Wildlife', duration:'1.5 hrs', description:"Sri Lanka's first open-air zoo located near the elephant orphanage, focusing on native animals like leopards." },
    { name:'Millennium Elephant Foundation', type:'Wildlife', duration:'1.5 hrs', description:'A family-run captive elephant sanctuary allowing visitors to walk with elephants and bathe them in the river.' },
    { name:'Saradiel Village', type:'Theme Park', duration:'1.5 hrs', description:'"A re-creation of the 19th-century village of Utuwankanda, telling the story of the Robin Hood of Sri Lanka".' },
    { name:'Asupini Ella', type:'Nature', duration:'1 hr', description:'A spectacular 30m waterfall that cascades from the edge of a rock in Aranayake, intertwined with local folklore.' },
  ],
};

(async () => {
  try {
    await sequelize.authenticate();
    console.log('DB connected');

    // Build a name → district_id map
    const districts = await District.findAll({ attributes: ['district_id', 'name'] });
    const nameToId = {};
    for (const d of districts) nameToId[d.name] = d.district_id;

    let created = 0, skipped = 0;

    for (const [districtName, places] of Object.entries(DESTINATIONS_BY_DISTRICT)) {
      const district_id = nameToId[districtName];
      if (!district_id) { console.warn(`District not found: ${districtName}`); continue; }

      for (const p of places) {
        const [, wasCreated] = await Place.findOrCreate({
          where: { name: p.name, district_id },
          defaults: { description: p.description, type: p.type, duration: p.duration, isActive: true },
        });
        if (wasCreated) created++; else skipped++;
      }
      console.log(`  ${districtName}: done`);
    }

    console.log(`\nSeeded ${created} destinations (${skipped} already existed)`);
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  }
})();
