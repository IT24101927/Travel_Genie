import { useState, useEffect } from 'react'
import { clearUserData } from '../../utils/clearUserData'
import { Link, useNavigate } from 'react-router-dom'
import ReviewSection from './ReviewSection'
import './DistrictExplore.css'

/* ─────────────────────────────────────────────────────────────────────────
   Rich place data keyed by district id
   Each place: { name, type, description, duration, image? }
───────────────────────────────────────────────────────────────────────── */
const PLACES_BY_DISTRICT = {
  d1: [ // Colombo
    { id:'p1', name:'Gangaramaya Temple', type:'Temple', duration:'1–2 hrs', description:'A unique fusion of Sri Lankan, Thai, Indian and Chinese architecture housing a vast museum collection and sacred relics.' },
    { id:'p2', name:'Galle Face Green', type:'Park', duration:'1 hr', description:'A sweeping ocean-side promenade where kite-flyers mingle with street-food vendors against a backdrop of crashing waves.' },
    { id:'p3', name:'National Museum', type:'Museum', duration:'2 hrs', description:'Sri Lanka\'s largest museum containing royal regalia, ancient artefacts and the island\'s most prized historical collections.' },
    { id:'p4', name:'Pettah Market', type:'Market', duration:'1–2 hrs', description:'Colombo\'s oldest and most chaotic bazaar — a sensory maze of spice stalls, fabric shops and Dutch-period mosques.' },
    { id:'p5', name:'Independence Memorial Hall', type:'Heritage', duration:'45 min', description:'A proud neoclassical monument built to commemorate Ceylon\'s independence in 1948, flanked by golden lion sculptures.' },
    { id:'p6', name:'Viharamahadevi Park', type:'Park', duration:'1 hr', description:'Colombo\'s oldest public park featuring shaded walkways, a golden Buddha statue and colourful seasonal flower beds.' },
    { id:'p7', name:'Lotus Tower', type:'Viewpoint', duration:'1 hr', description:'South Asia\'s tallest self-supported structure with a revolving restaurant and observation deck offering 360° city views.' },
    { id:'p8', name:'Mount Lavinia Beach', type:'Beach', duration:'2 hrs', description:'A famous colonial-era beach retreat just south of the city, known for its golden sands, seafood restaurants and sunset vibes.' },
    { id:'p9', name:'Kelaniya Raja Maha Vihara', type:'Temple', duration:'1.5 hrs', description:'A sacred temple believed to have been visited by the Buddha, famous for its reclining Buddha image and intricate paintings.' },
    { id:'p10', name:'One Galle Face Mall', type:'Shopping', duration:'2 hrs', description:'Colombo\'s premier luxury shopping and dining complex, perfect for escaping the heat and enjoying international brands.' },
    { id:'p11', name:'Dutch Hospital Shopping Precinct', type:'Heritage', duration:'1.5 hrs', description:'A 17th-century Dutch hospital beautifully restored into a high-end complex of restaurants, cafes, and spas.' },
    { id:'p12', name:'Red Mosque (Jami Ul-Alfar)', type:'Heritage', duration:'30 min', description:'A striking red-and-white candy-striped mosque in Pettah, one of Colombo\'s most photographed architectural wonders.' },
  ],
  d2: [ // Gampaha
    { id:'p1', name:'Pinnawala Elephant Orphanage', type:'Wildlife', duration:'2–3 hrs', description:'Home to one of the world\'s largest herds of captive elephants — watch them bathe in the river twice daily.' },
    { id:'p2', name:'Henarathgoda Botanical Garden', type:'Garden', duration:'1.5 hrs', description:'Sri Lanka\'s oldest botanical garden, where the first rubber tree in Asia was planted in 1876.' },
    { id:'p3', name:'Attanagalla Rajamaha Viharaya', type:'Temple', duration:'45 min', description:'A revered ancient temple set against a scenic rock face, worshipped by devotees of all faiths for its healing powers.' },
    { id:'p4', name:'Bolgoda Lake', type:'Lake', duration:'2 hrs', description:'One of Sri Lanka\'s largest natural freshwater lakes, perfect for boat rides through bird-filled mangrove channels.' },
    { id:'p5', name:'Seetha Eliya Dambulla', type:'Heritage', duration:'1 hr', description:'A scenic rural town known for its misty surroundings and proximity to ancient cave complexes.' },
    { id:'p6', name:'Kelaniya Water World', type:'Wildlife', duration:'1.5 hrs', description:'South Asia\'s first underwater tunnel aquarium and a riverside park with exotic birds and distinct aquatic life.' },
    { id:'p7', name:'Horagolla National Park', type:'Nature', duration:'1 hr', description:'One of the smallest national parks, urban and biodiverse, protecting a patch of secondary lowland rain forest.' },
    { id:'p8', name:'Thewatte Basilica (Tewatta)', type:'Heritage', duration:'1 hr', description:'The Basilica of Our Lady of Lanka, a national shrine of the Catholic church with unique post-independence architecture.' },
    { id:'p9', name:'Negombo Beach', type:'Beach', duration:'2 hrs', description:'A popular wide sandy beach lined with hotels and restaurants, known for its fishing industry and vibrant nightlife.' },
    { id:'p10', name:'Angurukaramulla Temple', type:'Temple', duration:'45 min', description:'A colourful temple in Negombo featuring a 6-metre high Buddha statue and a dragon entrance.' },
  ],
  d3: [ // Kalutara
    { id:'p1', name:'Kalutara Bodhiya', type:'Temple', duration:'45 min', description:'A hollow stupa containing a relic of the sacred Bo tree — one of the few stupas in the world that visitors can enter.' },
    { id:'p2', name:'Bentota River', type:'Nature', duration:'2 hrs', description:'A serene river lined with mangroves and water lilies, ideal for boat safaris spotting kingfishers, monitors and otters.' },
    { id:'p3', name:'Kalutara Beach', type:'Beach', duration:'2–3 hrs', description:'A long golden-sand beach popular with surfers and swimmers, framed by coconut palms and a lighthouse.' },
    { id:'p4', name:'Richmond Castle', type:'Heritage', duration:'1 hr', description:'A colonial-era mansion blending Italian and local architectural styles, once the residence of a Kandyan chieftain.' },
    { id:'p5', name:'Lunuganga Estate', type:'Garden', duration:'2 hrs', description:'Geoffrey Bawa\'s celebrated rural retreat — a landscape garden that inspired generations of tropical modernist design.' },
    { id:'p6', name:'Beruwala Lighthouse', type:'Viewpoint', duration:'30 min', description:'Sri Lanka\'s oldest lighthouse standing on a rocky headland, offering panoramic views of the harbour and sea.' },
    { id:'p7', name:'Brief Garden', type:'Garden', duration:'1.5 hrs', description:'The enchanting garden and home of Bevis Bawa, Geoffrey Bawa\'s brother, filled with sculptures and lush vegetation.' },
    { id:'p8', name:'Fa Hien Cave', type:'Heritage', duration:'1 hr', description:'One of the largest natural caves in Asia, where prehistoric human skeletal remains dating back 37,000 years were found.' },
    { id:'p9', name:'Thudugala Ella Waterfall', type:'Nature', duration:'1 hr', description:'A picturesque waterfall located in a rubber estate, popular for bathing and surrounded by lush green foliage.' },
    { id:'p10', name:'Kande Viharaya', type:'Temple', duration:'1 hr', description:'Home to one of the tallest sitting Buddha statues in Sri Lanka, attracting devotees from all over the country.' },
  ],
  d4: [ // Kandy
    { id:'p1', name:'Temple of the Tooth Relic', type:'Temple', duration:'2 hrs', description:'The most sacred Buddhist site in Sri Lanka, housing the tooth relic of the Buddha within a gilded casket.' },
    { id:'p2', name:'Kandy Lake', type:'Lake', duration:'1 hr', description:'A serene man-made lake in the heart of the city, perfect for an evening walk with views of the temple and hills.' },
    { id:'p3', name:'Peradeniya Botanical Gardens', type:'Garden', duration:'2–3 hrs', description:'One of Asia\'s finest botanical gardens with a spectacular avenue of royal palms and a 60-metre Java fig tree.' },
    { id:'p4', name:'Bahirawakanda Buddha Statue', type:'Temple', duration:'45 min', description:'A colossal white statue perched atop a hill offering the best aerial views of the city of Kandy.' },
    { id:'p5', name:'Kandyan Cultural Show', type:'Culture', duration:'1.5 hrs', description:'A vibrant nightly performance of traditional Kandyan dance, fire-walking and acrobatics at the cultural centre.' },
    { id:'p6', name:'Udawatta Kele Sanctuary', type:'Nature', duration:'2 hrs', description:'A royal forest reserve just above the temple, harbouring giant squirrels, monkeys and rare endemic birds.' },
    { id:'p7', name:'Ceylon Tea Museum', type:'Museum', duration:'1.5 hrs', description:'Housed in the 1925 Hantana Tea Factory, this museum showcases vintage tea-processing machinery and history.' },
    { id:'p8', name:'Commonwealth War Cemetery', type:'Heritage', duration:'30 min', description:'A beautifully maintained and peaceful memorial ground for soldiers of the British Empire who died in WWII.' },
    { id:'p9', name:'Gadaladeniya Temple', type:'Temple', duration:'45 min', description:'A 14th-century temple with South Indian architectural influence, built on a rock outcrop with panoramic views.' },
    { id:'p10', name:'Lankatilaka Vihara', type:'Temple', duration:'45 min', description:'Considered the most magnificent architectural edifice created during the Gampola era, standing on a large rock.' },
    { id:'p11', name:'Embekke Devalaya', type:'Heritage', duration:'45 min', description:'Famous for its intricate wood carvings on every pillar, depicting wrestlers, dancers, musicians and mythical beasts.' },
  ],
  d5: [ // Matale
    { id:'p1', name:'Nalanda Gedige', type:'Heritage', duration:'1 hr', description:'A 8th-century Hindu-Buddhist stone shrine — the only fully Mahayana Buddhist structure found in Sri Lanka.' },
    { id:'p2', name:'Aluvihara Rock Temple', type:'Temple', duration:'1.5 hrs', description:'An ancient cave temple where Buddhist scriptures were first committed to writing — murals vividly depict Buddhist concepts.' },
    { id:'p3', name:'Spice Garden Matale', type:'Garden', duration:'1 hr', description:'A working spice plantation where guides explain the cultivation of cinnamon, cloves, nutmeg and ayurvedic plants.' },
    { id:'p4', name:'Sri Muthumariamman Thevasthanam', type:'Temple', duration:'45 min', description:'Matale\'s celebrated Hindu temple renowned for its ornate gopuram tower richly adorned with painted deities.' },
    { id:'p5', name:'Sigiriya Rock', type:'Heritage', duration:'3 hrs', description:'Just outside Matale — the iconic 5th-century lion rock citadel rising 200 m, with frescoes and mirror wall.' },
    { id:'p6', name:'Pidurangala Rock', type:'Nature', duration:'2 hrs', description:'A rock formation adjacent to Sigiriya offering a challenging hike and likely the best view of Sigiriya Rock itself.' },
    { id:'p7', name:'Sembuwatta Lake', type:'Lake', duration:'2 hrs', description:'A breathtaking man-made lake surrounded by tea plantations and pine forest, with swimming pool and huts.' },
    { id:'p8', name:'Riverston Gap', type:'Viewpoint', duration:'3 hrs', description:'Wait for the mist to clear at this windy gap in the Knuckles Mountain Range for spectacular views and trekking.' },
    { id:'p9', name:'Wasgamuwa National Park', type:'Safari', duration:'3 hrs', description:'A less crowded park known for its large herds of elephants, sloth bears, and diverse bird species.' },
    { id:'p10', name:'Dambulla Cave Temple', type:'Temple', duration:'1.5 hrs', description:'The largest and best-preserved cave temple complex in Sri Lanka, a UNESCO World Heritage Site with 153 Buddha statues.' },
  ],
  d6: [ // Nuwara Eliya
    { id:'p1', name:"Horton Plains & World's End", type:'Nature', duration:'4–5 hrs', description:'A dramatic highland plateau ending at a 870 m precipice — an unmissable dawn hike through montane cloud forest.' },
    { id:'p2', name:'Gregory Lake', type:'Lake', duration:'1–2 hrs', description:'A picturesque reservoir allowing pedal-boating, horse riding and lakeside picnics in the cool mountain air.' },
    { id:'p3', name:'Hakgala Botanical Garden', type:'Garden', duration:'2 hrs', description:'A terraced garden at 1,745 m altitude famous for its rose collection, tree ferns and mist-shrouded rockery.' },
    { id:'p4', name:'Pedro Tea Estate', type:'Heritage', duration:'1.5 hrs', description:'One of the oldest working tea factories in Sri Lanka offering guided tours through withering rooms and rolling machines.' },
    { id:'p5', name:'Seetha Amman Temple', type:'Temple', duration:'45 min', description:'A colourful Hindu shrine marking the site where, according to Ramayana lore, Sita was held captive.' },
    { id:'p6', name:'Moon Plains', type:'Viewpoint', duration:'2 hrs', description:'A windswept highland plateau at 1,990 m with sweeping 360° views across the hill country and tea valleys.' },
    { id:'p7', name:'Victoria Park', type:'Park', duration:'1 hr', description:'A beautifully manicured park in the town centre, perfect for a stroll and famous for its rare bird species.' },
    { id:'p8', name:'St. Clair\'s Falls', type:'Nature', duration:'30 min', description:'Known as the "Little Niagara of Sri Lanka", this is one of the widest waterfalls in the country.' },
    { id:'p9', name:'Devon Falls', type:'Nature', duration:'30 min', description:'A stunning waterfall viewed from a dedicated viewing platform, named after a pioneer English coffee planter.' },
    { id:'p10', name:'Strawberry Fields', type:'Nature', duration:'45 min', description:'Visit a strawberry farm to pick fresh strawberries and enjoy strawberry pancakes and milkshakes.' },
    { id:'p11', name:'Ambewela Farm', type:'Nature', duration:'1.5 hrs', description:'Often called "Little New Zealand", a dairy farm with grazing cows, wind turbines and rolling green pastures.' },
  ],
  d7: [ // Galle
    { id:'p1', name:'Galle Fort', type:'Heritage', duration:'2–3 hrs', description:'A UNESCO-listed 17th-century Dutch fortification enclosing cobblestone streets, boutiques, cafés and ocean bastions.' },
    { id:'p2', name:'Galle Lighthouse', type:'Viewpoint', duration:'30 min', description:'The oldest lighthouse in Sri Lanka standing within the fort walls, offering panoramic views of the Indian Ocean.' },
    { id:'p3', name:'National Maritime Museum', type:'Museum', duration:'1.5 hrs', description:'Housed in a Dutch-era warehouse, it showcases Sri Lanka\'s rich seafaring heritage, coral ecosystems and ancient anchors.' },
    { id:'p4', name:'Jungle Beach (Unawatuna)', type:'Beach', duration:'3 hrs', description:'A calm sheltered bay just east of the fort — ideal for snorkelling over colourful reef teeming with tropical fish.' },
    { id:'p5', name:'Historical Mansion Museum', type:'Museum', duration:'1 hr', description:'A restored colonial house displaying antique furniture, vintage cameras, gems and porcelain from the Dutch period.' },
    { id:'p6', name:'Dutch Reformed Church', type:'Heritage', duration:'30 min', description:'One of Asia\'s oldest Protestant churches, with original wooden pews and gravestones dating back to 1640.' },
    { id:'p7', name:'Unawatuna Beach', type:'Beach', duration:'2 hrs', description:'A popular banana-shaped beach with calm waters, plenty of restaurants, and vibrant nightlife.' },
    { id:'p8', name:'Koggala Lake', type:'Lake', duration:'2 hrs', description:'Take a boat trip to Cinnamon Island and Temple Island, and see traditional stilt fishermen nearby.' },
    { id:'p9', name:'Japanese Peace Pagoda', type:'Viewpoint', duration:'45 min', description:'A white stupa located on Rumassala Hill offering peaceful vibes and stunning views of Galle Bay and the Fort.' },
    { id:'p10', name:'Sea Turtle Hatchery', type:'Wildlife', duration:'1 hr', description:'Conservation centers in Habaraduwa and Koggala caring for injured turtles and hatching eggs for release.' },
  ],
  d8: [ // Matara
    { id:'p1', name:'Mirissa Beach', type:'Beach', duration:'Half day', description:'A crescent-shaped bay anchored by Parrot Rock, famous worldwide for whale-watching boat trips from November to April.' },
    { id:'p2', name:'Star Fort Matara', type:'Heritage', duration:'1 hr', description:'A small but perfectly preserved 18th-century Dutch fort — its star-shaped ramparts enclose a tiny island within a moat.' },
    { id:'p3', name:'Paravi Duwa Temple', type:'Temple', duration:'45 min', description:'A small Buddhist temple on a tidal island connected to the mainland by a footbridge, especially atmospheric at dusk.' },
    { id:'p4', name:'Dondra Head Lighthouse', type:'Viewpoint', duration:'30 min', description:'The southernmost lighthouse in Sri Lanka and one of the tallest on the island — the very tip of the subcontinent.' },
    { id:'p5', name:'Polhena Reef', type:'Nature', duration:'2 hrs', description:'A shallow protected reef where snorkellers swim alongside sea turtles year-round in calm, clear water.' },
    { id:'p6', name:'Wella Dewalaya', type:'Temple', duration:'45 min', description:'An ancient Hindu shrines dedicated to the god Kataragama, beautifully situated on the banks of the Nilwala Ganga.' },
    { id:'p7', name:'Snake Farm', type:'Wildlife', duration:'1 hr', description:'A unique, albeit rustic, center in Weligama allowing supervised interaction with indigenous snakes.' },
    { id:'p8', name:'Coconut Tree Hill', type:'Viewpoint', duration:'45 min', description:'A private coconut estate on a high cliff in Mirissa, now a famous Instagram spot for its ocean backdrop.' },
    { id:'p9', name:'Secret Beach Mirissa', type:'Beach', duration:'2 hrs', description:'A tucked-away cove accessible by a steep path, offering a quieter alternative to the main beach.' },
    { id:'p10', name:'Weherahena Temple', type:'Temple', duration:'1 hr', description:'An underground temple tunnel complex adorned with Jataka story paintings, leading to a colossal Buddha statue.' },
  ],
  d9: [ // Hambantota
    { id:'p1', name:'Yala National Park', type:'Safari', duration:'Half day', description:'Sri Lanka\'s most visited park — roam its scrub forests for leopards, sloth bears, crocodiles and herds of wild elephants.' },
    { id:'p2', name:'Bundala National Park', type:'Safari', duration:'3 hrs', description:'A Ramsar Wetland Reserve drawing over 200 bird species; flamingo flocks are the star attraction from November to March.' },
    { id:'p3', name:'Tissamaharama Stupa', type:'Temple', duration:'1 hr', description:'One of Sri Lanka\'s greatest ancient stupas, built by King Kavantissa — gleaming white against the blue Tissa Wewa tank.' },
    { id:'p4', name:'Kataragama Dewalaya', type:'Temple', duration:'1 hr', description:'A multi-faith sacred complex revered by Buddhists, Hindus and Muslims — centre of the grand Kataragama festival.' },
    { id:'p5', name:'Rekawa Turtle Conservation', type:'Wildlife', duration:'2–3 hrs', description:'Nightly guided visits to a protected beach where five species of turtle nest — one of south Asia\'s finest turtle sites.' },
    { id:'p6', name:'Mulkirigala Rock Temple', type:'Temple', duration:'1.5 hrs', description:'A dramatic series of cave temples perched on a 210 m rock, adorned with ancient cave paintings and reclining Buddhas.' },
    { id:'p7', name:'Birds Park Hambantota', type:'Wildlife', duration:'2 hrs', description:'A research centre and park housing exotic birds, dedicated to conservation and education.' },
    { id:'p8', name:'Ridiyagama Safari Park', type:'Safari', duration:'2 hrs', description:'Sri Lanka\'s first open-air zoo where lions, tigers and herbivores roam freely while visitors tour in protected buses.' },
    { id:'p9', name:'Madunagala Hot Springs', type:'Nature', duration:'1 hr', description:'Natural thermal springs surrounded by paddy fields, renovated with bathing tanks for visitors.' },
    { id:'p10', name:'Ussangoda National Park', type:'Nature', duration:'1 hr', description:'A mysterious plateau with red soil and stunted vegetation, linked to the Ramayana legend of King Ravana.' },
  ],
  d10: [ // Jaffna
    { id:'p1', name:'Jaffna Fort', type:'Heritage', duration:'1.5 hrs', description:'A massive Portuguese-built, Dutch-expanded fort enclosing a lighthouse overlooking the crystal-clear Jaffna Lagoon.' },
    { id:'p2', name:'Nallur Kandaswamy Kovil', type:'Temple', duration:'1 hr', description:'Jaffna\'s most important Hindu temple with a soaring golden gopuram, famous for the 25-day annual Nallur Festival.' },
    { id:'p3', name:'Nainativu Island', type:'Heritage', duration:'Half day', description:'A pilgrimage island reached by boat, housing both the Naganadha Buddhist temple and the revered Nainativu Amman Kovil.' },
    { id:'p4', name:'Jaffna Public Library', type:'Heritage', duration:'45 min', description:'Rebuilt after its tragic burning — a neo-Dravidian landmark and symbol of Tamil culture, knowledge and resilience.' },
    { id:'p5', name:'Casuarina Beach', type:'Beach', duration:'2 hrs', description:'A quiet northern beach lined with casuarina trees, shallow turquoise water and spectacular sunset views.' },
    { id:'p6', name:'Keerimalai Hot Springs', type:'Nature', duration:'1 hr', description:'Natural saltwater springs beside the sea, believed since ancient times to have medicinal properties.' },
    { id:'p7', name:'Delft Island', type:'Nature', duration:'Half day', description:'A remote island with wild ponies, Dutch fort ruins, and a giant baobab tree, offering a glimpse of a different time.' },
    { id:'p8', name:'Dambakola Patuna', type:'Temple', duration:'1 hr', description:'The ancient port where Sanghamitta Theri landed with the sacred Bo sapling, now marked by a white temple.' },
    { id:'p9', name:'Point Pedro', type:'Viewpoint', duration:'30 min', description:'The northernmost point of Sri Lanka, marked by a sign and a lighthouse, with a vast open sea ahead.' },
    { id:'p10', name:'Rio Ice Cream', type:'Culture', duration:'30 min', description:'A legendary local ice cream parlour in Jaffna known for its sugary, colourful, and nostalgic sundaes.' },
  ],
  d11: [ // Kilinochchi
    { id:'p1', name:'Iranamadu Tank', type:'Lake', duration:'1.5 hrs', description:'One of the largest irrigation reservoirs in the north, fringed by birdlife and providing a peaceful scenic escape.' },
    { id:'p2', name:'War Memorial Water Tower', type:'Heritage', duration:'30 min', description:'An iconic symbol of Kilinochchi — a water tower blasted from its base, now preserved as a war memorial.' },
    { id:'p3', name:'Pooneryn Fort', type:'Heritage', duration:'1 hr', description:'A centuries-old Portuguese coastal fort offering views across the Jaffna Lagoon from its crumbling walls.' },
    { id:'p4', name:'Aadampan Bird Sanctuary', type:'Wildlife', duration:'2 hrs', description:'A tranquil wetland sanctuary drawing migratory wading birds including painted storks and open-bill storks.' },
    { id:'p5', name:'Kilinochchi Town Market', type:'Market', duration:'1 hr', description:'A lively local market reflecting the resilience and everyday life of the post-war northern community.' },
    { id:'p6', name:'Lubai Nagar Mosque', type:'Heritage', duration:'30 min', description:'A significant mosque in the area, serving as a community hub and architectural landmark.' },
    { id:'p7', name:'Devil\'s Point', type:'Viewpoint', duration:'1 hr', description:'A remote promontory sticking out into the Palk Bay, offering solitude and wild coastal views.' },
  ],
  d12: [ // Mannar
    { id:'p1', name:'Mannar Fort', type:'Heritage', duration:'1.5 hrs', description:'A Portuguese-built coastal fort expanded by the Dutch, still enclosing an old church and garrison buildings.' },
    { id:'p2', name:'Ancient Baobab Tree', type:'Nature', duration:'30 min', description:'A 700-year-old African baobab tree — the oldest in Asia, said to have been planted by Arab traders.' },
    { id:"p3", name:"Adam's Bridge (Rama's Bridge)", type:'Heritage', duration:'2 hrs', description:'A chain of limestone shoals connecting Sri Lanka to India, held sacred in both Hindu and local Buddhist traditions.' },
    { id:'p4', name:"Giant's Tank & Bird Sanctuary", type:'Wildlife', duration:'2 hrs', description:'A vast ancient reservoir attracting painted storks, pelicans and spot-billed pelicans during migratory season.' },
    { id:'p5', name:'Talaimannar Pier', type:'Viewpoint', duration:'1 hr', description:'The westernmost tip of Sri Lanka, from where ferries once crossed to India and where sunsets paint the sky gold.' },
    { id:'p6', name:'Thiruketheeswaram Kovil', type:'Temple', duration:'1 hr', description:'One of the five ancient ishwarams dedicated to Lord Shiva, a major pilgrimage site with a large tank.' },
    { id:'p7', name:'Doric House', type:'Heritage', duration:'45 min', description:'The ruins of the former residence of the first British Governor of Ceylon, located on a cliff edge.' },
    { id:'p8', name:'Mannar Bird Sanctuary', type:'Wildlife', duration:'2 hrs', description:'Famous for the annual migration of flamingos and other waders, creating a pink spectacle in the shallow waters.' },
  ],
  d13: [ // Vavuniya
    { id:'p1', name:'Kandasamy Kovil', type:'Temple', duration:'45 min', description:'A colourful and ornate Hindu temple which is one of the most significant religious sites in Vavuniya.' },
    { id:'p2', name:'Madhu Church', type:'Heritage', duration:'1 hr', description:'The most venerated Catholic shrine in Sri Lanka, drawing hundreds of thousands of pilgrims each year from all faiths.' },
    { id:'p3', name:'Ularapokuna Tank', type:'Lake', duration:'1 hr', description:'An ancient reservoir ringed by forested hills and rich birdlife — ideal for a peaceful morning boat trip.' },
    { id:'p4', name:'Vavuniya Museum', type:'Museum', duration:'1.5 hrs', description:'Documenting the district\'s rich archaeological heritage across thousands of years of continuous settlement.' },
    { id:'p5', name:'Cheddikulam Bird Sanctuary', type:'Wildlife', duration:'2 hrs', description:'A lush forest reserve surrounding a tank, sheltering endemic dry-zone birds and small mammals.' },
    { id:'p6', name:'Grand Jummah Mosque', type:'Heritage', duration:'30 min', description:'A beautiful mosque in the heart of Vavuniya town, reflecting the diverse culture of the region.' },
    { id:'p7', name:'Iratperiyakulam Tank', type:'Lake', duration:'1 hr', description:'A scenic spot for a stopover, with a bathing enclosure and ancient ruins nearby.' },
  ],
  d14: [ // Mullaitivu
    { id:'p1', name:'Mullaitivu Beach', type:'Beach', duration:'2 hrs', description:'A vast untouched coastline with powder-white sand and crystal water — one of the quietest beaches in Sri Lanka.' },
    { id:'p2', name:'Nandikadal Lagoon', type:'Nature', duration:'2 hrs', description:'A large brackish lagoon of immense natural and historical significance, now returning to a state of serene beauty.' },
    { id:'p3', name:'Chalai Beach', type:'Beach', duration:'2 hrs', description:'A pristine, largely undisturbed beach backed by casuarina groves — ideal for solitude seekers.' },
    { id:'p4', name:'Mangrove Canoe Tours', type:'Nature', duration:'2–3 hrs', description:'Paddle through dense mangrove channels teeming with kingfishers, mudskippers and sea eagles.' },
    { id:'p5', name:'Putumattalan Memorial', type:'Heritage', duration:'45 min', description:'A significant post-war commemorative site marking the area\'s history and journey toward peace and reconciliation.' },
    { id:'p6', name:'Kokkilai Bird Sanctuary', type:'Wildlife', duration:'2 hrs', description:'A coastal sanctuary rich in mangroves and sea grass beds, hosting large flocks of migratory birds.' },
    { id:'p7', name:'Red Barna Golf Club', type:'Adventure', duration:'2 hrs', description:'A sandy, coastal golf course maintained by the military, offering a unique sporting experience.' },
  ],
  d15: [ // Trincomalee
    { id:'p1', name:'Koneswaram Temple', type:'Temple', duration:'1 hr', description:'A magnificent clifftop Hindu temple dedicated to Lord Shiva, with the sea crashing 130 m below its foundations.' },
    { id:'p2', name:'Nilaveli Beach', type:'Beach', duration:'Half day', description:'Among the most beautiful beaches in Asia — a 15 km strip of powder-white sand and shallow turquoise sea.' },
    { id:'p3', name:'Pigeon Island Marine NP', type:'Nature', duration:'3 hrs', description:'A pristine coral reef teeming with blacktip reef sharks, parrotfish, clownfish and spectacular staghorn coral.' },
    { id:'p4', name:'Hot Springs (Kanniya)', type:'Nature', duration:'1 hr', description:'Seven natural springs of varying temperatures rising from the earth, believed to have been created by Ravana.' },
    { id:'p5', name:'Fort Frederick', type:'Heritage', duration:'1 hr', description:'A Portuguese-Dutch fort on a peninsula, home to a herd of semi-wild spotted deer strolling its grassy ramparts.' },
    { id:'p6', name:'Whale Watching', type:'Wildlife', duration:'4 hrs', description:'Blue whales, sperm whales and pods of spinner dolphins visit from March to August off the Trincomalee coast.' },
    { id:'p7', name:'Marble Beach', type:'Beach', duration:'2 hrs', description:'A hidden gem handled by the air force, known for its extremely calm, marble-like surface and clear waters.' },
    { id:'p8', name:'Gokana Temple', type:'Temple', duration:'30 min', description:'A Buddhist temple inside Fort Frederick offering a stunning vantage point over the Trincomalee Harbour.' },
    { id:'p9', name:'Naval Museum', type:'Museum', duration:'1.5 hrs', description:'Located at the Hoods Tower Naval Base, displaying naval guns, artifacts and history of the port.' },
    { id:'p10', name:'Seruwila Mangala Raja Maha Vihara', type:'Temple', duration:'1 hr', description:'An ancient stupa built by King Kavantissa containing the forehead bone relic of the Buddha.' },
  ],
  d16: [ // Batticaloa
    { id:'p1', name:'Batticaloa Fort', type:'Heritage', duration:'1 hr', description:'A well-preserved Dutch-era fort on a small island encircled by a lagoon — the best colonial fort in eastern Sri Lanka.' },
    { id:'p2', name:'Pasikudah Bay', type:'Beach', duration:'Half day', description:'A world-famous shallow crescent bay where you can wade 700 m out to sea — one of the world\'s safest swimming beaches.' },
    { id:'p3', name:'Singing Fish Lagoon', type:'Nature', duration:'2 hrs', description:'A magical phenomenon where fish vibrate to produce musical tones from the lagoon on moonlit nights.' },
    { id:'p4', name:'Kallady Bridge', type:'Viewpoint', duration:'30 min', description:'The longest bridge in Sri Lanka crossing the Batticaloa Lagoon — a superb spot to watch the colourful evening sky.' },
    { id:'p5', name:'Kalkudah Beach', type:'Beach', duration:'3 hrs', description:'An arc of golden sand backed by casuarina trees and calm azure water — a quieter alternative to Pasikudah.' },
    { id:'p6', name:'Batticaloa Lighthouse', type:'Heritage', duration:'30 min', description:'A historic lighthouse built in 1913, offering scenic views of the park and lagoon estuary nearby.' },
    { id:'p7', name:'Batticaloa Gate', type:'Heritage', duration:'30 min', description:'A monument marking the landing site of the first Methodist missionaries, located in Gandhi Park.' },
    { id:'p8', name:'Amritagali Mamangam Kovil', type:'Temple', duration:'45 min', description:'A revered Hindu temple believed to be built on a spot where Lord Rama worshipped Shiva.' },
  ],
  d17: [ // Ampara
    { id:'p1', name:'Arugam Bay', type:'Beach', duration:'Half day', description:'A globally ranked right-hand point break surfing destination with a laid-back village atmosphere and wildlife nearby.' },
    { id:'p2', name:'Kumana National Park', type:'Safari', duration:'Half day', description:'A vast birding paradise with storks, herons and ibis nesting in the lagoon, plus elephants and leopards in the scrub.' },
    { id:'p3', name:'Lahugala Elephant Sanctuary', type:'Wildlife', duration:'2 hrs', description:'A small but densely populated reserve — one of the best places in Sri Lanka to see large elephant herds at close range.' },
    { id:'p4', name:'Deegavapi Stupa', type:'Heritage', duration:'1 hr', description:'An ancient stupa enshrining a sacred relic of the Buddha, one of the most revered pilgrimage sites in the east.' },
    { id:'p5', name:'Crocodile Rock (Arugam Bay)', type:'Viewpoint', duration:'1.5 hrs', description:'A scenic headland dotted with sunbathing crocs and roosting birds, reached by a short jungle walk.' },
    { id:'p6', name:'Muhudu Maha Vihara', type:'Heritage', duration:'45 min', description:'Beachside ruins of an ancient temple marking the landing place of Queen Viharamahadevi.' },
    { id:'p7', name:'Whisky Point', type:'Beach', duration:'2 hrs', description:'A popular surf break north of Arugam Bay with reliable waves and a fun, party atmosphere.' },
    { id:'p8', name:'Panama Tank', type:'Nature', duration:'1 hr', description:'A scenic reservoir near the coast where you can spot crocodiles and elephants in the evening.' },
    { id:'p9', name:'Buddhangala Monastery', type:'Temple', duration:'1 hr', description:'A forest hermitage dating back to the 2nd century BC, situated on a rock with panoramic jungle views.' },
  ],
  d18: [ // Kurunegala
    { id:'p1', name:'Ethagala (Elephant Rock)', type:'Viewpoint', duration:'1 hr', description:'An enormous granite boulder shaped like a crouching elephant, scalable for panoramic views of the city and plains.' },
    { id:'p2', name:'Ridi Vihara', type:'Temple', duration:'1.5 hrs', description:'A cave temple famous for its silver-ore-encrusted shrine room, fine Kandyan murals and ancient moonstone.' },
    { id:'p3', name:'Aukana Buddha Statue', type:'Heritage', duration:'1. hr', description:'A magnificent 5th-century standing Buddha carved from a single granite rock, standing 12 m tall in a forest clearing.' },
    { id:'p4', name:'Padeniya Raja Maha Vihara', type:'Temple', duration:'1 hr', description:'A medieval gem of Kandyan-era temple architecture with exquisitely carved wooden pillars and a moonstoned entrance.' },
    { id:'p5', name:'Kurunegala Lake', type:'Lake', duration:'1 hr', description:'A beautiful man-made tank at the heart of the city, flanked by the rock hills and the town\'s colonial clock tower.' },
    { id:'p6', name:'Yapahuwa Rock Fortress', type:'Heritage', duration:'2 hrs', description:'A short-lived medieval capital built on a sheer rock, famous for its ornate stone staircase and lion sculptures.' },
    { id:'p7', name:'Panduwasnuwara ruins', type:'Heritage', duration:'1.5 hrs', description:'Ruins of an ancient capital city featuring a citadel, palace, monasteries, and a reservoir.' },
    { id:'p8', name:'Arankele Forest Monastery', type:'Nature', duration:'1.5 hrs', description:'A serene 6th-century forest hermitage with hot water baths and meditation pathways under a canopy of ironwood trees.' },
  ],
  d19: [ // Puttalam
    { id:'p1', name:'Wilpattu National Park', type:'Safari', duration:'Half day', description:'Sri Lanka\'s largest national park, with a network of natural water-filled lakes (villus) beloved by leopards and sloth bears.' },
    { id:'p2', name:'Kalpitiya Peninsula', type:'Beach', duration:'2–3 hrs', description:'A pristine sandbar strip with world-class kitesurfing conditions from May to October and dolphin watching year-round.' },
    { id:'p3', name:'Puttalam Lagoon', type:'Nature', duration:'2 hrs', description:'A vast shallow lagoon dotted with mangrove islets, home to flamingoes and colourful migratory wading birds.' },
    { id:'p4', name:'Salt Flats of Puttalam', type:'Nature', duration:'1 hr', description:'Shimmering pink-white salt pans that glow vivid magenta at dawn — a surreal and photogenic landscape.' },
    { id:'p5', name:'Dutch Fort Kalpitiya', type:'Heritage', duration:'1 hr', description:'A small but well-preserved Portuguese-Dutch coastal fort overlooking the sea — the oldest fort in Sri Lanka\'s north west.' },
    { id:'p6', name:'Munneswaram Temple', type:'Temple', duration:'1 hr', description:'A major Hindu temple complex dedicated to Shiva, one of the five ancient Ishwarams of Sri Lanka.' },
    { id:'p7', name:'St. Anne’s Church, Talawila', type:'Heritage', duration:'1 hr', description:'A famous Catholic pilgrimage site located on a sandy spit of land, hosting massive festivals.' },
    { id:'p8', name:'Norochcholai Coal Power Plant', type:'Viewpoint', duration:'30 min', description:'View the massive cooling towers and infrastructure of Sri Lanka’s first coal power plant from the outside.' },
    { id:'p9', name:'Anawilundawa Bird Sanctuary', type:'Wildlife', duration:'2 hrs', description:'A RAMSAR wetland with a system of tanks offering a haven for resident and migratory birds.' },
  ],
  d20: [ // Anuradhapura
    { id:'p1', name:'Sri Maha Bodhi', type:'Temple', duration:'1.5 hrs', description:'The most sacred tree on earth — a 2,300-year-old fig tree grown from a cutting of the original tree under which Buddha attained enlightenment.' },
    { id:'p2', name:'Ruwanwelisaya Stupa', type:'Heritage', duration:'1 hr', description:'A colossal white stupa 91 m tall built by King Dutugamunu, radiating a serene peace across the ancient city.' },
    { id:'p3', name:'Abhayagiri Monastery', type:'Heritage', duration:'2 hrs', description:'A vast monastic complex that once hosted 5,000 monks — wander its stupas, moonstones and meditation ponds.' },
    { id:'p4', name:'Isurumuniya Vihara', type:'Temple', duration:'1 hr', description:'A rock cave temple famous for the "Isurumuniya Lovers" — a 6th-century bas-relief of India\'s finest ancient sculptures.' },
    { id:'p5', name:'Mihintale', type:'Heritage', duration:'2 hrs', description:'The birthplace of Buddhism in Sri Lanka — climb 1,840 granite steps to the summit where Mahinda met King Devanampiya Tissa.' },
    { id:'p6', name:'Thuparama Stupa', type:'Heritage', duration:'45 min', description:'The oldest domed stupa in Sri Lanka, built in the 3rd century BC to enshrine the right collarbone relic of the Buddha.' },
    { id:'p7', name:'Lovamahapaya', type:'Heritage', duration:'30 min', description:'The "Brazen Palace", once a 9-storey building with a bronze roof, now a sea of 1,600 stone pillars.' },
    { id:'p8', name:'Jetavanaramaya', type:'Heritage', duration:'1 hr', description:'Once the third tallest structure in the world after the Giza pyramids, this massive brick stupa is an engineering marvel.' },
    { id:'p9', name:'Kuttam Pokuna (Twin Ponds)', type:'Heritage', duration:'45 min', description:'Beautifully restored ancient bathing pools that demonstrate the sophisticated hydrology of the Anuradhapura era.' },
    { id:'p10', name:'Moonstone (Sandakada Pahana)', type:'Heritage', duration:'30 min', description:'Admire the most exquisitely carved semi-circular stone doorstep found at the Queen\'s Palace.' },
  ],
  d21: [ // Polonnaruwa
    { id:'p1', name:'Gal Vihara', type:'Heritage', duration:'1.5 hrs', description:'Four magnificent rock-cut Buddha figures — the 15 m reclining Parinirvana is considered the pinnacle of Sinhalese artistry.' },
    { id:'p2', name:'Parakrama Samudra', type:'Lake', duration:'1 hr', description:'A vast medieval sea-like reservoir built by King Parakramabahu I — still irrigating thousands of acres today.' },
    { id:'p3', name:'Royal Palace of Parakramabahu', type:'Heritage', duration:'1.5 hrs', description:'The ruins of a 7-storey palace with 1,000 rooms, surrounded by bathing pools and audience halls of cut stone.' },
    { id:'p4', name:'Vatadage', type:'Heritage', duration:'45 min', description:'A circular relic house protecting the oldest stupa in Polonnaruwa — stunning moonstones face each cardinal direction.' },
    { id:'p5', name:'Lankathilaka Image House', type:'Heritage', duration:'1 hr', description:'A 13th-century shrine with an imposing 18 m standing headless Buddha rising from brick ruins against the sky.' },
    { id:'p6', name:'Minneriya National Park', type:'Safari', duration:'3 hrs', description:'Home to "The Gathering" — the world\'s largest elephant congregation, with 400+ elephants assembling each July–October.' },
    { id:'p7', name:'Somawathiya Chaitya', type:'Temple', duration:'1.5 hrs', description:'An ancient stupa deep in the jungle believed to house the right tooth relic of the Buddha.' },
    { id:'p8', name:'Rankoth Vehera', type:'Heritage', duration:'45 min', description:'The largest stupa in Polonnaruwa, mimicking the colossal style of Anuradhapura\'s monuments.' },
    { id:'p9', name:'Kaudulla National Park', type:'Safari', duration:'3 hrs', description:'A key elephant corridor park centered around an ancient tank, offering excellent wildlife viewing.' },
    { id:'p10', name:'Pothgul Vihara', type:'Heritage', duration:'45 min', description:'The "Library Monastery", featuring a unique statue believed to be King Parakramabahu holding a palm leaf book.' },
  ],
  d22: [ // Badulla
    { id:'p1', name:'Nine Arch Bridge, Ella', type:'Heritage', duration:'2 hrs', description:'An iconic colonial-era stone viaduct built without steel or cement — watching a blue train cross it is unforgettable.' },
    { id:'p2', name:'Ella Rock Hike', type:'Nature', duration:'4 hrs', description:'A full-morning hike through tea estates to a summit commanding a sea-of-clouds view across the southern hill country.' },
    { id:'p3', name:'Rawana Falls', type:'Nature', duration:'1 hr', description:'A 25 m wide cascading curtain falls — one of the widest waterfalls in Sri Lanka, easily visible from the main road.' },
    { id:'p4', name:'Little Adam\'s Peak', type:'Viewpoint', duration:'2 hrs', description:'A beginner-friendly hike through a tea plantation ending in a 360° panorama nearly identical to Adam\'s Peak.' },
    { id:'p5', name:'Dunhinda Falls', type:'Nature', duration:'1.5 hrs', description:'A thundering 63 m plunge fall reached by a jungle trail — spray from its mist creates perpetual rainbows.' },
    { id:'p6', name:'Demodara Train Loop', type:'Heritage', duration:'1 hr', description:'A remarkable feat of engineering where the train spirals underground and resurfaces above where it just passed.' },
    { id:'p7', name:'Muthiyangana Raja Maha Vihara', type:'Temple', duration:'1 hr', description:'An ancient temple in Badulla town, one of the 16 sacred places (Solosmasthana) visited by Buddha.' },
    { id:'p8', name:'Lipton\'s Seat', type:'Viewpoint', duration:'2 hrs', description:'Sir Thomas Lipton\'s favorite view point, offering a dazzling panorama of tea estates across 7 districts.' },
    { id:'p9', name:'Adisham Bungalow', type:'Heritage', duration:'1 hr', description:'A Benedictine monastery housed in a distinctively English country cottage-style granite mansion in Haputale.' },
    { id:'p10', name:'Diyaluma Falls', type:'Nature', duration:'2 hrs', description:'The second highest waterfall in Sri Lanka, with natural infinity pools at the top for brave swimmers.' },
  ],
  d23: [ // Monaragala
    { id:'p1', name:'Maligawila Buddha Statue', type:'Heritage', duration:'1.5 hrs', description:'A stunning 11 m 7th-century standing Buddha carved from a single dolomite stone — the tallest ancient stone statue in Sri Lanka.' },
    { id:'p2', name:'Buduruwagala Rock Temple', type:'Heritage', duration:'1.5 hrs', description:'Seven giant 9th-century Mahayana Buddhist rock reliefs carved into a jungle cliff — a hidden masterpiece of the ancient world.' },
    { id:'p3', name:'Gal Oya National Park', type:'Safari', duration:'Half day', description:'The only boat safari in Sri Lanka — glide silently past bathing elephants swimming between islands in a vast reservoir.' },
    { id:'p4', name:'Wellawaya Valley', type:'Viewpoint', duration:'2 hrs', description:'A scenic lowland plain framed by rock outcrops and paddy fields — an exceptional viewpoint on the Ella-Hambantota road pass.' },
    { id:'p5', name:'Inginiyagala Dam', type:'Nature', duration:'1 hr', description:'A large earth dam and reservoir forming the centrepiece of an important irrigation and birding area.' },
    { id:'p6', name:'Yudaganawa Stupa', type:'Heritage', duration:'45 min', description:'One of the largest stupas in the country, with unique architecture, located near Buttala.' },
    { id:'p7', name:'Maduru Oya National Park', type:'Safari', duration:'3 hrs', description:'Famous for its elephant herds and the ancient sluice gate discovered there dating back to the Anuradhapura period.' },
    { id:'p8', name:'Nilgala Forest Reserve', type:'Nature', duration:'2 hrs', description:'A medicinal plant forest and savanna known for its medicinal herds and as a butterfly hotspot.' },
  ],
  d24: [ // Ratnapura
    { id:"p1", name:"Adam's Peak (Sri Pada)", type:'Heritage', duration:'5–6 hrs', description:'A pre-dawn pilgrimage hike of 5,500 steps to a summit sacred to four religions — rewarded with a sunrise above the clouds.' },
    { id:'p2', name:'Sinharaja Forest Reserve', type:'Nature', duration:'Half day', description:'A UNESCO Biosphere Reserve and the last viable primary rainforest in Sri Lanka — a birdwatcher\'s paradise with 21 endemic species.' },
    { id:'p3', name:'Ratnapura Gem Museum', type:'Museum', duration:'1.5 hrs', description:'Discover Sri Lanka\'s centuries-old gem industry — blue sapphires, cat\'s eyes and rubies all mined from these red soils.' },
    { id:'p4', name:'Maha Saman Devalaya', type:'Temple', duration:'1 hr', description:'The principal shrine of Saman — a guardian deity of Sri Lanka — situated in a lush river valley near Ratnapura town.' },
    { id:'p5', name:'Bopath Falls', type:'Nature', duration:'1 hr', description:'A 30 m waterfall that fans into a Bo-leaf shape as it tumbles — one of the most photographed falls in Sri Lanka.' },
    { id:'p6', name:'Udawalawe National Park', type:'Safari', duration:'3 hrs', description:'The best park for guaranteed elephant sightings year-round, along with water buffalo, sambar deer and crocodiles.' },
    { id:'p7', name:'Batadombalena', type:'Heritage', duration:'1.5 hrs', description:'An archaeological cave site yielding \'Balangoda Man\' fossils, shedding light on prehistoric humans in Sri Lanka.' },
    { id:'p8', name:'Pahanthudawa Falls', type:'Nature', duration:'1 hr', description:'A uniquely shaped waterfall creating a deep pool, resembling the wick of a traditional oil lamp.' },
    { id:'p9', name:'Waulpane Limestone Cave', type:'Adventure', duration:'2 hrs', description:'Known as the "Cave of Bats", this 500m long cave contains a waterfall inside and millions of bats.' },
  ],
  d25: [ // Kegalle
    { id:'p1', name:'White Water Rafting, Kitulgala', type:'Adventure', duration:'3 hrs', description:'Sri Lanka\'s premier rafting destination on the Kelani River — grade 3–4 rapids through jungle gorges (October–April).' },
    { id:'p2', name:'Belilena Cave', type:'Heritage', duration:'1.5 hrs', description:'A prehistoric cave shelter containing evidence of human habitation going back 37,000 years, with an on-site museum.' },
    { id:'p3', name:'Bridge on the River Kwai Site', type:'Heritage', duration:'1 hr', description:'David Lean\'s 1957 Oscar-winning film was shot on the Kelani River near Kitulgala — the original bridge is gone but the river is stunning.' },
    { id:'p4', name:'Rambukkana', type:'Heritage', duration:'1 hr', description:'Famous for its steep railway incline; watch the steam engine helpers push carriages up the dramatic Kadugannawa Pass.' },
    { id:'p5', name:'Ambuluwawa Tower', type:'Viewpoint', duration:'2 hrs', description:'A multi-religious tower atop a 1,021 m biodiversity complex, visible from Kandy and offering spectacular views.' },
    { id:'p6', name:'Pinnawala Open Zoo', type:'Wildlife', duration:'1.5 hrs', description:'Sri Lanka\'s first open-air zoo located near the elephant orphanage, focusing on native animals like leopards.' },
    { id:'p7', name:'Millennium Elephant Foundation', type:'Wildlife', duration:'1.5 hrs', description:'A family-run captive elephant sanctuary allowing visitors to walk with elephants and bathe them in the river.' },
    { id:'p8', name:'Saradiel Village', type:'Theme Park', duration:'1.5 hrs', description:'A re-creation of the 19th-century village of Utuwankanda, telling the story of the "Robin Hood of Sri Lanka".' },
    { id:'p9', name:'Asupini Ella', type:'Nature', duration:'1 hr', description:'A spectacular 30m waterfall that cascades from the edge of a rock in Aranayake, intertwined with local folklore.' },
  ],
}

/* Place type → emoji icon */
const TYPE_EMOJIS = {
  Temple: '🛕', Beach: '🏖️', Nature: '🌿', Heritage: '🏛️',
  Museum: '🏛️', Safari: '🐘', Wildlife: '🦁', Garden: '🌸',
  Lake: '🏞️', Market: '🛍️', Viewpoint: '🏔️', Culture: '🎭',
  Adventure: '🧗', Park: '🌳', Shopping: '🛍️', 'Theme Park': '🎢',
}

/* Place type → colour mapping */
const TYPE_COLOURS = {
  Temple:    { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A' },
  Beach:     { bg: '#DBEAFE', text: '#1E40AF', border: '#BFDBFE' },
  Nature:    { bg: '#DCFCE7', text: '#166534', border: '#BBF7D0' },
  Heritage:  { bg: '#EDE9FE', text: '#5B21B6', border: '#DDD6FE' },
  Museum:    { bg: '#FCE7F3', text: '#9D174D', border: '#FBCFE8' },
  Safari:    { bg: '#FFF7ED', text: '#C2410C', border: '#FED7AA' },
  Wildlife:  { bg: '#F0FDF4', text: '#15803D', border: '#BBF7D0' },
  Garden:    { bg: '#ECFDF5', text: '#065F46', border: '#A7F3D0' },
  Lake:      { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' },
  Market:    { bg: '#FFF1F2', text: '#BE123C', border: '#FECDD3' },
  Viewpoint: { bg: '#F5F3FF', text: '#6D28D9', border: '#E9D5FF' },
  Culture:   { bg: '#FFF7ED', text: '#B45309', border: '#FDE68A' },
  Adventure: { bg: '#FFF1F2', text: '#B91C1C', border: '#FECACA' },
  Park:      { bg: '#F0FDF4', text: '#166534', border: '#BBF7D0' },
  Shopping:  { bg: '#FFF7ED', text: '#C2410C', border: '#FED7AA' },
  'Theme Park': { bg: '#FDF2F8', text: '#DB2777', border: '#FBCFE8' },
}

/* Place type → representative fallback photo */
const TYPE_IMAGES = {
  Temple:    'https://images.unsplash.com/photo-1548013146-72479768bada?w=600&auto=format',
  Beach:     'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&auto=format',
  Nature:    'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=600&auto=format',
  Heritage:  'https://images.unsplash.com/photo-1553913861-c0fddf2619ee?w=600&auto=format',
  Museum:    'https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=600&auto=format',
  Safari:    'https://images.unsplash.com/photo-1549366021-9f761d450615?w=600&auto=format',
  Wildlife:  'https://images.unsplash.com/photo-1564760055775-d63b17a55c44?w=600&auto=format',
  Garden:    'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600&auto=format',
  Lake:      'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=600&auto=format',
  Market:    'https://images.unsplash.com/photo-1533900298318-6b8da08a523e?w=600&auto=format',
  Viewpoint: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&auto=format',
  Culture:   'https://images.unsplash.com/photo-1582192730841-2a682d7375f9?w=600&auto=format',
  Adventure: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600&auto=format',
  Park:      'https://images.unsplash.com/photo-1586348943529-beaae6c28db9?w=600&auto=format',
  Shopping:  'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=600&auto=format',
  'Theme Park': 'https://images.unsplash.com/photo-1513889961551-628c1e5e2ee9?w=600&auto=format',
}

function typePill(type) {
  const c = TYPE_COLOURS[type] || { bg: '#F3F4F6', text: '#374151', border: '#E5E7EB' }
  return { background: c.bg, color: c.text, border: `1px solid ${c.border}` }
}





/* ─── Place Card ─── */
function PlaceCard({ place, districtId, district, selected, onToggle, isSaved, onSave }) {
  const [showReviews, setShowReviews] = useState(false)
  const [imgError,    setImgError]    = useState(false)
  const reviewId   = `${districtId}_${place.id}`
  const fallbackImg = TYPE_IMAGES[place.type] || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&auto=format'
  const displayImg  = imgError ? fallbackImg : (place.image || fallbackImg)
  const c = TYPE_COLOURS[place.type] || { bg: '#F3F4F6', text: '#374151', border: '#E5E7EB' }

  return (
    <div id={`place-card-${districtId}_${place.id}`} className={`de-place-card ${selected ? 'selected' : ''} ${showReviews ? 'de-place-card--open' : ''}`}>

      {/* ── Card main (LEFT) ── */}
      <div className="de-place-card-main">

        {/* ── Image ── */}
        <div className="de-place-img-wrap" onClick={() => onToggle(place)}>
          <img
            src={displayImg}
            alt={place.name}
            onError={() => setImgError(true)}
            loading="lazy"
          />
          <span className="de-place-type-badge" style={{ background: c.bg, color: c.text }}>
            {place.type}
          </span>
          <span className="de-place-dur-badge">⏱ {place.duration}</span>
          {selected && (
            <div className="de-place-selected-overlay">
              <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"
                strokeLinecap="round" strokeLinejoin="round" width="36" height="36">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
          )}
        </div>

        {/* ── Body ── */}
        <div className="de-place-body">
          <h4 className="de-place-name">{place.name}</h4>
          <p className="de-place-desc">{place.description}</p>
        </div>

        {/* ── Footer ── */}
        <div className="de-place-footer">
          <button
            className={`de-place-add-btn ${selected ? 'added' : ''}`}
            onClick={() => onToggle(place)}
          >
            {selected ? (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                  strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                In your trip
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                  strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Add to trip
              </>
            )}
          </button>
          <button
            className={`de-save-btn ${isSaved ? 'saved' : ''}`}
            onClick={e => { e.stopPropagation(); onSave(place) }}
            title={isSaved ? 'Remove from saved' : 'Save to dashboard'}
          >
            {isSaved ? '❤️' : '🤍'}
          </button>
          <button
            className={`de-reviews-toggle ${showReviews ? 'active' : ''}`}
            onClick={e => { e.stopPropagation(); setShowReviews(s => !s) }}
          >
            {showReviews ? '✕ Hide' : '⭐ Reviews'}
          </button>
        </div>

      </div>{/* end de-place-card-main */}

      {/* ── Reviews panel (RIGHT when open) ── */}
      {showReviews && (
        <div className="de-reviews-panel" onClick={e => e.stopPropagation()}>
          <ReviewSection
            targetType="place"
            targetId={reviewId}
            targetName={place.name}
            districtName={district?.name || ''}
            dbId={place.place_id ?? place.dbId ?? null}
          />
        </div>
      )}
    </div>
  )
}

/* ─── Main Component ─── */
function DistrictExplore({ theme, toggleTheme }) {
  const navigate = useNavigate()
  const [menuOpen,       setMenuOpen]       = useState(false)
  const [district,       setDistrict]       = useState(null)
  const [selectedPlaces, setSelectedPlaces] = useState([])
  const [filterType,     setFilterType]     = useState('All')
  const [savedIds, setSavedIds] = useState(() => {
    try {
      const raw = localStorage.getItem('savedDestinations')
      return new Set((raw ? JSON.parse(raw) : []).map(d => d.id))
    } catch { return new Set() }
  })
  const [toast, setToast] = useState(null)

  useEffect(() => {
    const raw = localStorage.getItem('selectedDistrict')
    if (!raw) { navigate('/plan-trip'); return }
    const d = JSON.parse(raw)
    setDistrict(d)
    // Restore previously selected places (e.g. when editing a trip)
    const savedPlaces = localStorage.getItem('selectedPlaces')
    if (savedPlaces) {
      try { setSelectedPlaces(JSON.parse(savedPlaces)) } catch { /* ignore */ }
    }
    // Scroll to a specific saved place if requested
    const scrollTarget = localStorage.getItem('scrollToPlace')
    if (scrollTarget) {
      localStorage.removeItem('scrollToPlace')
      setTimeout(() => {
        const el = document.getElementById(`place-card-${d.id}_${scrollTarget}`)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          el.classList.add('de-place-highlight')
          setTimeout(() => el.classList.remove('de-place-highlight'), 2200)
        }
      }, 350)
    }
  }, [navigate])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('currentUser')
    clearUserData()
    navigate('/')
  }

  if (!district) return null

  const places = PLACES_BY_DISTRICT[district.id] || []
  const types  = ['All', ...Array.from(new Set(places.map(p => p.type)))]

  const visiblePlaces = filterType === 'All'
    ? places
    : places.filter(p => p.type === filterType)

  const togglePlace = (place) => {
    setSelectedPlaces(prev =>
      prev.find(p => p.id === place.id)
        ? prev.filter(p => p.id !== place.id)
        : [...prev, place]
    )
  }

  const toggleSave = (place) => {
    const savedKey = `de_${district.id}_${place.id}`
    const raw = localStorage.getItem('savedDestinations')
    let list = raw ? JSON.parse(raw) : []
    const isSaved = savedIds.has(savedKey)
    if (isSaved) {
      list = list.filter(d => d.id !== savedKey)
      setSavedIds(prev => { const s = new Set(prev); s.delete(savedKey); return s })
      setToast({ msg: `Removed "${place.name}" from saved`, type: 'remove' })
    } else {
      const fallback = TYPE_IMAGES[place.type] || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&auto=format'
      list = [...list, {
        id: savedKey,
        name: place.name,
        category: place.type,
        province: district.province,
        districtName: district.name,
        districtId: district.id,
        placeId: place.id,
        districtData: district,
        image: place.image || fallback,
        icon: TYPE_EMOJIS[place.type] || '📍',
        description: place.description,
        details: `Duration: ${place.duration}`,
        tours: null,
        savedAt: new Date().toISOString(),
      }]
      setSavedIds(prev => new Set([...prev, savedKey]))
      setToast({ msg: `Saved "${place.name}" to dashboard!`, type: 'save' })
    }
    localStorage.setItem('savedDestinations', JSON.stringify(list))
    setTimeout(() => setToast(null), 2500)
  }

  const handleContinue = () => {
    // Store both the district and the selected places
    localStorage.setItem('selectedDistrict', JSON.stringify(district))
    localStorage.setItem('selectedPlaces', JSON.stringify(selectedPlaces))
    navigate('/trip-preferences')
  }

  return (
    <div className="de-page">
      {/* ── Toast ── */}
      {toast && (
        <div className={`de-save-toast ${toast.type}`}>
          {toast.type === 'save' ? '❤️' : '🩶'} {toast.msg}
        </div>
      )}
      {/* ── Nav ── */}
      <nav className="dashboard-nav glass-nav">
        <div className="nav-container">
          <button className="logo" onClick={() => navigate('/dashboard')} style={{background:'none',border:'none',cursor:'pointer',padding:0}}>Travel<span>Genie</span></button>
          <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
            <span className={`hamburger ${menuOpen ? 'open' : ''}`} />
          </button>
          <ul className={`nav-menu ${menuOpen ? 'active' : ''}`}>
            <li><Link to="/dashboard">Dashboard</Link></li>
            <li><Link to="/plan-trip" className="active-link">Plan a Trip</Link></li>
            <li><Link to="/profile">Profile</Link></li>
          </ul>
          <div className="nav-actions">
            <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
              {theme === 'light' ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
              )}
            </button>
            <button className="btn-logout" onClick={handleLogout}>Log Out</button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="de-hero">
        <div className="de-hero-inner">

          {/* Step progress */}
          <div className="de-breadcrumb">
            <div className="de-step done" onClick={() => navigate('/plan-trip')} title="Choose District">
              <span className="de-step-num">1</span>
              <span className="de-step-label">District</span>
            </div>
            <div className="de-dot-line done" />
            <div className="de-step active">
              <span className="de-step-num">2</span>
              <span className="de-step-label">Places</span>
            </div>
            <div className="de-dot-line" />
            <div className="de-step">
              <span className="de-step-num">3</span>
              <span className="de-step-label">Preferences</span>
            </div>
            <div className="de-dot-line" />
            <div className="de-step">
              <span className="de-step-num">4</span>
              <span className="de-step-label">Hotel</span>
            </div>
            <div className="de-dot-line" />
            <div className="de-step">
              <span className="de-step-num">5</span>
              <span className="de-step-label">Budget</span>
            </div>
            <div className="de-dot-line" />
            <div className="de-step">
              <span className="de-step-num">6</span>
              <span className="de-step-label">Details</span>
            </div>
          </div>

          <p className="de-eyebrow">🗺️ Step 2 — Pick Your Places</p>
          <h1>Explore <em>{district.name}</em></h1>
          <p className="de-hero-sub">{district.description}</p>

          <div className="de-dest-pill">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            {district.province} Province
            {district.bestFor?.length > 0 && <>
              <span className="de-pill-divider">·</span>
              {district.bestFor.slice(0, 3).join(' · ')}
            </>}
          </div>

        </div>
      </section>

      {/* ── Body ── */}
      <div className="de-body">

        {/* ── Places ── */}
        <main className="de-main">

          {/* Section header */}
          <div className="de-section-header">
            <div className="de-section-title">
              <h2>
                Places to Visit
                <span className="de-count-badge">{visiblePlaces.length}</span>
              </h2>
              <p className="de-section-sub">Tap a card to add it to your itinerary</p>
            </div>

            {/* Type filter */}
            <div className="de-type-filter">
              {types.map(t => (
                <button
                  key={t}
                  className={`de-type-pill ${filterType === t ? 'active' : ''}`}
                  onClick={() => setFilterType(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Selected chips strip */}
          {selectedPlaces.length > 0 && (
            <div className="de-selected-strip">
              <span className="de-sel-label">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                  strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                {selectedPlaces.length} selected
              </span>
              {selectedPlaces.map(p => (
                <span key={p.id} className="de-sel-chip">
                  {p.name}
                  <button onClick={() => togglePlace(p)} aria-label={`Remove ${p.name}`}>×</button>
                </span>
              ))}
            </div>
          )}

          <div className="de-places-grid">
            {visiblePlaces.map(place => (
              <PlaceCard
                key={place.id}
                place={place}
                districtId={district.id}
                district={district}
                selected={!!selectedPlaces.find(p => p.id === place.id)}
                onToggle={togglePlace}
                isSaved={savedIds.has(`de_${district.id}_${place.id}`)}
                onSave={toggleSave}
              />
            ))}
          </div>

          {/* ── Selection summary + CTA ── */}
          <div className="de-cta-bar">
            <button className="de-back-btn" onClick={() => navigate('/plan-trip')}>
              ← Back
            </button>

            <div className="de-cta-summary">
              {selectedPlaces.length === 0 ? (
                <span className="de-cta-hint">No places selected yet — tap a card to add</span>
              ) : (
                <div className="de-footer-strip">
                  {selectedPlaces.map(p => {
                    const fallback = TYPE_IMAGES[p.type] || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=200&q=60'
                    const img = p.image || fallback
                    return (
                      <div key={p.id} className="de-footer-chip">
                        <div className="de-footer-chip-img-wrap">
                          <img src={img} alt={p.name} className="de-footer-chip-img" />
                          <button
                            type="button"
                            className="de-footer-chip-remove"
                            onClick={() => togglePlace(p)}
                            title="Remove"
                          >✕</button>
                        </div>
                        <div className="de-footer-chip-meta">
                          <span className="de-footer-chip-name">{p.name}</span>
                          {p.duration && <span className="de-footer-chip-dur">⏱ {p.duration}</span>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <button
              className="de-continue-btn"
              onClick={handleContinue}
            >
              Continue
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="5" y1="12" x2="19" y2="12"/>
                <polyline points="12,5 19,12 12,19"/>
              </svg>
            </button>
          </div>
        </main>

      </div>
    </div>
  )
}

export default DistrictExplore
