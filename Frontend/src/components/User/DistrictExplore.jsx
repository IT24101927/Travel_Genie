import { useState, useEffect } from 'react'
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
  ],
  d2: [ // Gampaha
    { id:'p1', name:'Pinnawala Elephant Orphanage', type:'Wildlife', duration:'2–3 hrs', description:'Home to one of the world\'s largest herds of captive elephants — watch them bathe in the river twice daily.' },
    { id:'p2', name:'Henarathgoda Botanical Garden', type:'Garden', duration:'1.5 hrs', description:'Sri Lanka\'s oldest botanical garden, where the first rubber tree in Asia was planted in 1876.' },
    { id:'p3', name:'Attanagalla Rajamaha Viharaya', type:'Temple', duration:'45 min', description:'A revered ancient temple set against a scenic rock face, worshipped by devotees of all faiths for its healing powers.' },
    { id:'p4', name:'Bolgoda Lake', type:'Lake', duration:'2 hrs', description:'One of Sri Lanka\'s largest natural freshwater lakes, perfect for boat rides through bird-filled mangrove channels.' },
    { id:'p5', name:'Seetha Eliya Dambulla', type:'Heritage', duration:'1 hr', description:'A scenic rural town known for its misty surroundings and proximity to ancient cave complexes.' },
  ],
  d3: [ // Kalutara
    { id:'p1', name:'Kalutara Bodhiya', type:'Temple', duration:'45 min', description:'A hollow stupa containing a relic of the sacred Bo tree — one of the few stupas in the world that visitors can enter.' },
    { id:'p2', name:'Bentota River', type:'Nature', duration:'2 hrs', description:'A serene river lined with mangroves and water lilies, ideal for boat safaris spotting kingfishers, monitors and otters.' },
    { id:'p3', name:'Kalutara Beach', type:'Beach', duration:'2–3 hrs', description:'A long golden-sand beach popular with surfers and swimmers, framed by coconut palms and a lighthouse.' },
    { id:'p4', name:'Richmond Castle', type:'Heritage', duration:'1 hr', description:'A colonial-era mansion blending Italian and local architectural styles, once the residence of a Kandyan chieftain.' },
    { id:'p5', name:'Lunuganga Estate', type:'Garden', duration:'2 hrs', description:'Geoffrey Bawa\'s celebrated rural retreat — a landscape garden that inspired generations of tropical modernist design.' },
    { id:'p6', name:'Beruwala Lighthouse', type:'Viewpoint', duration:'30 min', description:'Sri Lanka\'s oldest lighthouse standing on a rocky headland, offering panoramic views of the harbour and sea.' },
  ],
  d4: [ // Kandy
    { id:'p1', name:'Temple of the Tooth Relic', type:'Temple', duration:'2 hrs', description:'The most sacred Buddhist site in Sri Lanka, housing the tooth relic of the Buddha within a gilded casket.' },
    { id:'p2', name:'Kandy Lake', type:'Lake', duration:'1 hr', description:'A serene man-made lake in the heart of the city, perfect for an evening walk with views of the temple and hills.' },
    { id:'p3', name:'Peradeniya Botanical Gardens', type:'Garden', duration:'2–3 hrs', description:'One of Asia\'s finest botanical gardens with a spectacular avenue of royal palms and a 60-metre Java fig tree.' },
    { id:'p4', name:'Bahirawakanda Buddha Statue', type:'Temple', duration:'45 min', description:'A colossal white statue perched atop a hill offering the best aerial views of the city of Kandy.' },
    { id:'p5', name:'Kandyan Cultural Show', type:'Culture', duration:'1.5 hrs', description:'A vibrant nightly performance of traditional Kandyan dance, fire-walking and acrobatics at the cultural centre.' },
    { id:'p6', name:'Udawatta Kele Sanctuary', type:'Nature', duration:'2 hrs', description:'A royal forest reserve just above the temple, harbouring giant squirrels, monkeys and rare endemic birds.' },
  ],
  d5: [ // Matale
    { id:'p1', name:'Nalanda Gedige', type:'Heritage', duration:'1 hr', description:'A 8th-century Hindu-Buddhist stone shrine — the only fully Mahayana Buddhist structure found in Sri Lanka.' },
    { id:'p2', name:'Aluvihara Rock Temple', type:'Temple', duration:'1.5 hrs', description:'An ancient cave temple where Buddhist scriptures were first committed to writing — murals vividly depict Buddhist concepts.' },
    { id:'p3', name:'Spice Garden Matale', type:'Garden', duration:'1 hr', description:'A working spice plantation where guides explain the cultivation of cinnamon, cloves, nutmeg and ayurvedic plants.' },
    { id:'p4', name:'Sri Muthumariamman Thevasthanam', type:'Temple', duration:'45 min', description:'Matale\'s celebrated Hindu temple renowned for its ornate gopuram tower richly adorned with painted deities.' },
    { id:'p5', name:'Sigiriya Rock', type:'Heritage', duration:'3 hrs', description:'Just outside Matale — the iconic 5th-century lion rock citadel rising 200 m, with frescoes and mirror wall.' },
  ],
  d6: [ // Nuwara Eliya
    { id:'p1', name:"Horton Plains & World's End", type:'Nature', duration:'4–5 hrs', description:'A dramatic highland plateau ending at a 870 m precipice — an unmissable dawn hike through montane cloud forest.' },
    { id:'p2', name:'Gregory Lake', type:'Lake', duration:'1–2 hrs', description:'A picturesque reservoir allowing pedal-boating, horse riding and lakeside picnics in the cool mountain air.' },
    { id:'p3', name:'Hakgala Botanical Garden', type:'Garden', duration:'2 hrs', description:'A terraced garden at 1,745 m altitude famous for its rose collection, tree ferns and mist-shrouded rockery.' },
    { id:'p4', name:'Pedro Tea Estate', type:'Heritage', duration:'1.5 hrs', description:'One of the oldest working tea factories in Sri Lanka offering guided tours through withering rooms and rolling machines.' },
    { id:'p5', name:'Seetha Amman Temple', type:'Temple', duration:'45 min', description:'A colourful Hindu shrine marking the site where, according to Ramayana lore, Sita was held captive.' },
    { id:'p6', name:'Moon Plains', type:'Viewpoint', duration:'2 hrs', description:'A windswept highland plateau at 1,990 m with sweeping 360° views across the hill country and tea valleys.' },
  ],
  d7: [ // Galle
    { id:'p1', name:'Galle Fort', type:'Heritage', duration:'2–3 hrs', description:'A UNESCO-listed 17th-century Dutch fortification enclosing cobblestone streets, boutiques, cafés and ocean bastions.' },
    { id:'p2', name:'Galle Lighthouse', type:'Viewpoint', duration:'30 min', description:'The oldest lighthouse in Sri Lanka standing within the fort walls, offering panoramic views of the Indian Ocean.' },
    { id:'p3', name:'National Maritime Museum', type:'Museum', duration:'1.5 hrs', description:'Housed in a Dutch-era warehouse, it showcases Sri Lanka\'s rich seafaring heritage, coral ecosystems and ancient anchors.' },
    { id:'p4', name:'Jungle Beach (Unawatuna)', type:'Beach', duration:'3 hrs', description:'A calm sheltered bay just east of the fort — ideal for snorkelling over colourful reef teeming with tropical fish.' },
    { id:'p5', name:'Historical Mansion Museum', type:'Museum', duration:'1 hr', description:'A restored colonial house displaying antique furniture, vintage cameras, gems and porcelain from the Dutch period.' },
    { id:'p6', name:'Dutch Reformed Church', type:'Heritage', duration:'30 min', description:'One of Asia\'s oldest Protestant churches, with original wooden pews and gravestones dating back to 1640.' },
  ],
  d8: [ // Matara
    { id:'p1', name:'Mirissa Beach', type:'Beach', duration:'Half day', description:'A crescent-shaped bay anchored by Parrot Rock, famous worldwide for whale-watching boat trips from November to April.' },
    { id:'p2', name:'Star Fort Matara', type:'Heritage', duration:'1 hr', description:'A small but perfectly preserved 18th-century Dutch fort — its star-shaped ramparts enclose a tiny island within a moat.' },
    { id:'p3', name:'Paravi Duwa Temple', type:'Temple', duration:'45 min', description:'A small Buddhist temple on a tidal island connected to the mainland by a footbridge, especially atmospheric at dusk.' },
    { id:'p4', name:'Dondra Head Lighthouse', type:'Viewpoint', duration:'30 min', description:'The southernmost lighthouse in Sri Lanka and one of the tallest on the island — the very tip of the subcontinent.' },
    { id:'p5', name:'Polhena Reef', type:'Nature', duration:'2 hrs', description:'A shallow protected reef where snorkellers swim alongside sea turtles year-round in calm, clear water.' },
    { id:'p6', name:'Wella Dewalaya', type:'Temple', duration:'45 min', description:'An ancient Hindu shrines dedicated to the god Kataragama, beautifully situated on the banks of the Nilwala Ganga.' },
  ],
  d9: [ // Hambantota
    { id:'p1', name:'Yala National Park', type:'Safari', duration:'Half day', description:'Sri Lanka\'s most visited park — roam its scrub forests for leopards, sloth bears, crocodiles and herds of wild elephants.' },
    { id:'p2', name:'Bundala National Park', type:'Safari', duration:'3 hrs', description:'A Ramsar Wetland Reserve drawing over 200 bird species; flamingo flocks are the star attraction from November to March.' },
    { id:'p3', name:'Tissamaharama Stupa', type:'Temple', duration:'1 hr', description:'One of Sri Lanka\'s greatest ancient stupas, built by King Kavantissa — gleaming white against the blue Tissa Wewa tank.' },
    { id:'p4', name:'Kataragama Dewalaya', type:'Temple', duration:'1 hr', description:'A multi-faith sacred complex revered by Buddhists, Hindus and Muslims — centre of the grand Kataragama festival.' },
    { id:'p5', name:'Rekawa Turtle Conservation', type:'Wildlife', duration:'2–3 hrs', description:'Nightly guided visits to a protected beach where five species of turtle nest — one of south Asia\'s finest turtle sites.' },
    { id:'p6', name:'Mulkirigala Rock Temple', type:'Temple', duration:'1.5 hrs', description:'A dramatic series of cave temples perched on a 210 m rock, adorned with ancient cave paintings and reclining Buddhas.' },
  ],
  d10: [ // Jaffna
    { id:'p1', name:'Jaffna Fort', type:'Heritage', duration:'1.5 hrs', description:'A massive Portuguese-built, Dutch-expanded fort enclosing a lighthouse overlooking the crystal-clear Jaffna Lagoon.' },
    { id:'p2', name:'Nallur Kandaswamy Kovil', type:'Temple', duration:'1 hr', description:'Jaffna\'s most important Hindu temple with a soaring golden gopuram, famous for the 25-day annual Nallur Festival.' },
    { id:'p3', name:'Nainativu Island', type:'Heritage', duration:'Half day', description:'A pilgrimage island reached by boat, housing both the Naganadha Buddhist temple and the revered Nainativu Amman Kovil.' },
    { id:'p4', name:'Jaffna Public Library', type:'Heritage', duration:'45 min', description:'Rebuilt after its tragic burning — a neo-Dravidian landmark and symbol of Tamil culture, knowledge and resilience.' },
    { id:'p5', name:'Casuarina Beach', type:'Beach', duration:'2 hrs', description:'A quiet northern beach lined with casuarina trees, shallow turquoise water and spectacular sunset views.' },
    { id:'p6', name:'Keerimalai Hot Springs', type:'Nature', duration:'1 hr', description:'Natural saltwater springs beside the sea, believed since ancient times to have medicinal properties.' },
  ],
  d11: [ // Kilinochchi
    { id:'p1', name:'Iranamadu Tank', type:'Lake', duration:'1.5 hrs', description:'One of the largest irrigation reservoirs in the north, fringed by birdlife and providing a peaceful scenic escape.' },
    { id:'p2', name:'War Memorial Water Tower', type:'Heritage', duration:'30 min', description:'An iconic symbol of Kilinochchi — a water tower blasted from its base, now preserved as a war memorial.' },
    { id:'p3', name:'Pooneryn Fort', type:'Heritage', duration:'1 hr', description:'A centuries-old Portuguese coastal fort offering views across the Jaffna Lagoon from its crumbling walls.' },
    { id:'p4', name:'Aadampan Bird Sanctuary', type:'Wildlife', duration:'2 hrs', description:'A tranquil wetland sanctuary drawing migratory wading birds including painted storks and open-bill storks.' },
    { id:'p5', name:'Kilinochchi Town Market', type:'Market', duration:'1 hr', description:'A lively local market reflecting the resilience and everyday life of the post-war northern community.' },
  ],
  d12: [ // Mannar
    { id:'p1', name:'Mannar Fort', type:'Heritage', duration:'1.5 hrs', description:'A Portuguese-built coastal fort expanded by the Dutch, still enclosing an old church and garrison buildings.' },
    { id:'p2', name:'Ancient Baobab Tree', type:'Nature', duration:'30 min', description:'A 700-year-old African baobab tree — the oldest in Asia, said to have been planted by Arab traders.' },
    { id:"p3", name:"Adam's Bridge (Rama's Bridge)", type:'Heritage', duration:'2 hrs', description:'A chain of limestone shoals connecting Sri Lanka to India, held sacred in both Hindu and local Buddhist traditions.' },
    { id:'p4', name:"Giant's Tank & Bird Sanctuary", type:'Wildlife', duration:'2 hrs', description:'A vast ancient reservoir attracting painted storks, pelicans and spot-billed pelicans during migratory season.' },
    { id:'p5', name:'Talaimannar Pier', type:'Viewpoint', duration:'1 hr', description:'The westernmost tip of Sri Lanka, from where ferries once crossed to India and where sunsets paint the sky gold.' },
  ],
  d13: [ // Vavuniya
    { id:'p1', name:'Kandasamy Kovil', type:'Temple', duration:'45 min', description:'A colourful and ornate Hindu temple which is one of the most significant religious sites in Vavuniya.' },
    { id:'p2', name:'Madhu Church', type:'Heritage', duration:'1 hr', description:'The most venerated Catholic shrine in Sri Lanka, drawing hundreds of thousands of pilgrims each year from all faiths.' },
    { id:'p3', name:'Ularapokuna Tank', type:'Lake', duration:'1 hr', description:'An ancient reservoir ringed by forested hills and rich birdlife — ideal for a peaceful morning boat trip.' },
    { id:'p4', name:'Vavuniya Museum', type:'Museum', duration:'1.5 hrs', description:'Documenting the district\'s rich archaeological heritage across thousands of years of continuous settlement.' },
    { id:'p5', name:'Cheddikulam Bird Sanctuary', type:'Wildlife', duration:'2 hrs', description:'A lush forest reserve surrounding a tank, sheltering endemic dry-zone birds and small mammals.' },
  ],
  d14: [ // Mullaitivu
    { id:'p1', name:'Mullaitivu Beach', type:'Beach', duration:'2 hrs', description:'A vast untouched coastline with powder-white sand and crystal water — one of the quietest beaches in Sri Lanka.' },
    { id:'p2', name:'Nandikadal Lagoon', type:'Nature', duration:'2 hrs', description:'A large brackish lagoon of immense natural and historical significance, now returning to a state of serene beauty.' },
    { id:'p3', name:'Chalai Beach', type:'Beach', duration:'2 hrs', description:'A pristine, largely undisturbed beach backed by casuarina groves — ideal for solitude seekers.' },
    { id:'p4', name:'Mangrove Canoe Tours', type:'Nature', duration:'2–3 hrs', description:'Paddle through dense mangrove channels teeming with kingfishers, mudskippers and sea eagles.' },
    { id:'p5', name:'Putumattalan Memorial', type:'Heritage', duration:'45 min', description:'A significant post-war commemorative site marking the area\'s history and journey toward peace and reconciliation.' },
  ],
  d15: [ // Trincomalee
    { id:'p1', name:'Koneswaram Temple', type:'Temple', duration:'1 hr', description:'A magnificent clifftop Hindu temple dedicated to Lord Shiva, with the sea crashing 130 m below its foundations.' },
    { id:'p2', name:'Nilaveli Beach', type:'Beach', duration:'Half day', description:'Among the most beautiful beaches in Asia — a 15 km strip of powder-white sand and shallow turquoise sea.' },
    { id:'p3', name:'Pigeon Island Marine NP', type:'Nature', duration:'3 hrs', description:'A pristine coral reef teeming with blacktip reef sharks, parrotfish, clownfish and spectacular staghorn coral.' },
    { id:'p4', name:'Hot Springs (Kanniya)', type:'Nature', duration:'1 hr', description:'Seven natural springs of varying temperatures rising from the earth, believed to have been created by Ravana.' },
    { id:'p5', name:'Fort Frederick', type:'Heritage', duration:'1 hr', description:'A Portuguese-Dutch fort on a peninsula, home to a herd of semi-wild spotted deer strolling its grassy ramparts.' },
    { id:'p6', name:'Whale Watching', type:'Wildlife', duration:'4 hrs', description:'Blue whales, sperm whales and pods of spinner dolphins visit from March to August off the Trincomalee coast.' },
  ],
  d16: [ // Batticaloa
    { id:'p1', name:'Batticaloa Fort', type:'Heritage', duration:'1 hr', description:'A well-preserved Dutch-era fort on a small island encircled by a lagoon — the best colonial fort in eastern Sri Lanka.' },
    { id:'p2', name:'Pasikudah Bay', type:'Beach', duration:'Half day', description:'A world-famous shallow crescent bay where you can wade 700 m out to sea — one of the world\'s safest swimming beaches.' },
    { id:'p3', name:'Singing Fish Lagoon', type:'Nature', duration:'2 hrs', description:'A magical phenomenon where fish vibrate to produce musical tones from the lagoon on moonlit nights.' },
    { id:'p4', name:'Kallady Bridge', type:'Viewpoint', duration:'30 min', description:'The longest bridge in Sri Lanka crossing the Batticaloa Lagoon — a superb spot to watch the colourful evening sky.' },
    { id:'p5', name:'Kalkudah Beach', type:'Beach', duration:'3 hrs', description:'An arc of golden sand backed by casuarina trees and calm azure water — a quieter alternative to Pasikudah.' },
  ],
  d17: [ // Ampara
    { id:'p1', name:'Arugam Bay', type:'Beach', duration:'Half day', description:'A globally ranked right-hand point break surfing destination with a laid-back village atmosphere and wildlife nearby.' },
    { id:'p2', name:'Kumana National Park', type:'Safari', duration:'Half day', description:'A vast birding paradise with storks, herons and ibis nesting in the lagoon, plus elephants and leopards in the scrub.' },
    { id:'p3', name:'Lahugala Elephant Sanctuary', type:'Wildlife', duration:'2 hrs', description:'A small but densely populated reserve — one of the best places in Sri Lanka to see large elephant herds at close range.' },
    { id:'p4', name:'Deegavapi Stupa', type:'Heritage', duration:'1 hr', description:'An ancient stupa enshrining a sacred relic of the Buddha, one of the most revered pilgrimage sites in the east.' },
    { id:'p5', name:'Crocodile Rock (Arugam Bay)', type:'Viewpoint', duration:'1.5 hrs', description:'A scenic headland dotted with sunbathing crocs and roosting birds, reached by a short jungle walk.' },
  ],
  d18: [ // Kurunegala
    { id:'p1', name:'Ethagala (Elephant Rock)', type:'Viewpoint', duration:'1 hr', description:'An enormous granite boulder shaped like a crouching elephant, scalable for panoramic views of the city and plains.' },
    { id:'p2', name:'Ridi Vihara', type:'Temple', duration:'1.5 hrs', description:'A cave temple famous for its silver-ore-encrusted shrine room, fine Kandyan murals and ancient moonstone.' },
    { id:'p3', name:'Aukana Buddha Statue', type:'Heritage', duration:'1. hr', description:'A magnificent 5th-century standing Buddha carved from a single granite rock, standing 12 m tall in a forest clearing.' },
    { id:'p4', name:'Padeniya Raja Maha Vihara', type:'Temple', duration:'1 hr', description:'A medieval gem of Kandyan-era temple architecture with exquisitely carved wooden pillars and a moonstoned entrance.' },
    { id:'p5', name:'Kurunegala Lake', type:'Lake', duration:'1 hr', description:'A beautiful man-made tank at the heart of the city, flanked by the rock hills and the town\'s colonial clock tower.' },
  ],
  d19: [ // Puttalam
    { id:'p1', name:'Wilpattu National Park', type:'Safari', duration:'Half day', description:'Sri Lanka\'s largest national park, with a network of natural water-filled lakes (villus) beloved by leopards and sloth bears.' },
    { id:'p2', name:'Kalpitiya Peninsula', type:'Beach', duration:'2–3 hrs', description:'A pristine sandbar strip with world-class kitesurfing conditions from May to October and dolphin watching year-round.' },
    { id:'p3', name:'Puttalam Lagoon', type:'Nature', duration:'2 hrs', description:'A vast shallow lagoon dotted with mangrove islets, home to flamingoes and colourful migratory wading birds.' },
    { id:'p4', name:'Salt Flats of Puttalam', type:'Nature', duration:'1 hr', description:'Shimmering pink-white salt pans that glow vivid magenta at dawn — a surreal and photogenic landscape.' },
    { id:'p5', name:'Dutch Fort Kalpitiya', type:'Heritage', duration:'1 hr', description:'A small but well-preserved Portuguese-Dutch coastal fort overlooking the sea — the oldest fort in Sri Lanka\'s north west.' },
  ],
  d20: [ // Anuradhapura
    { id:'p1', name:'Sri Maha Bodhi', type:'Temple', duration:'1.5 hrs', description:'The most sacred tree on earth — a 2,300-year-old fig tree grown from a cutting of the original tree under which Buddha attained enlightenment.' },
    { id:'p2', name:'Ruwanwelisaya Stupa', type:'Heritage', duration:'1 hr', description:'A colossal white stupa 91 m tall built by King Dutugamunu, radiating a serene peace across the ancient city.' },
    { id:'p3', name:'Abhayagiri Monastery', type:'Heritage', duration:'2 hrs', description:'A vast monastic complex that once hosted 5,000 monks — wander its stupas, moonstones and meditation ponds.' },
    { id:'p4', name:'Isurumuniya Vihara', type:'Temple', duration:'1 hr', description:'A rock cave temple famous for the "Isurumuniya Lovers" — a 6th-century bas-relief of India\'s finest ancient sculptures.' },
    { id:'p5', name:'Mihintale', type:'Heritage', duration:'2 hrs', description:'The birthplace of Buddhism in Sri Lanka — climb 1,840 granite steps to the summit where Mahinda met King Devanampiya Tissa.' },
    { id:'p6', name:'Thuparama Stupa', type:'Heritage', duration:'45 min', description:'The oldest domed stupa in Sri Lanka, built in the 3rd century BC to enshrine the right collarbone relic of the Buddha.' },
  ],
  d21: [ // Polonnaruwa
    { id:'p1', name:'Gal Vihara', type:'Heritage', duration:'1.5 hrs', description:'Four magnificent rock-cut Buddha figures — the 15 m reclining Parinirvana is considered the pinnacle of Sinhalese artistry.' },
    { id:'p2', name:'Parakrama Samudra', type:'Lake', duration:'1 hr', description:'A vast medieval sea-like reservoir built by King Parakramabahu I — still irrigating thousands of acres today.' },
    { id:'p3', name:'Royal Palace of Parakramabahu', type:'Heritage', duration:'1.5 hrs', description:'The ruins of a 7-storey palace with 1,000 rooms, surrounded by bathing pools and audience halls of cut stone.' },
    { id:'p4', name:'Vatadage', type:'Heritage', duration:'45 min', description:'A circular relic house protecting the oldest stupa in Polonnaruwa — stunning moonstones face each cardinal direction.' },
    { id:'p5', name:'Lankathilaka Image House', type:'Heritage', duration:'1 hr', description:'A 13th-century shrine with an imposing 18 m standing headless Buddha rising from brick ruins against the sky.' },
    { id:'p6', name:'Minneriya National Park', type:'Safari', duration:'3 hrs', description:'Home to "The Gathering" — the world\'s largest elephant congregation, with 400+ elephants assembling each July–October.' },
  ],
  d22: [ // Badulla
    { id:'p1', name:'Nine Arch Bridge, Ella', type:'Heritage', duration:'2 hrs', description:'An iconic colonial-era stone viaduct built without steel or cement — watching a blue train cross it is unforgettable.' },
    { id:'p2', name:'Ella Rock Hike', type:'Nature', duration:'4 hrs', description:'A full-morning hike through tea estates to a summit commanding a sea-of-clouds view across the southern hill country.' },
    { id:'p3', name:'Rawana Falls', type:'Nature', duration:'1 hr', description:'A 25 m wide cascading curtain falls — one of the widest waterfalls in Sri Lanka, easily visible from the main road.' },
    { id:'p4', name:'Little Adam\'s Peak', type:'Viewpoint', duration:'2 hrs', description:'A beginner-friendly hike through a tea plantation ending in a 360° panorama nearly identical to Adam\'s Peak.' },
    { id:'p5', name:'Dunhinda Falls', type:'Nature', duration:'1.5 hrs', description:'A thundering 63 m plunge fall reached by a jungle trail — spray from its mist creates perpetual rainbows.' },
    { id:'p6', name:'Demodara Train Loop', type:'Heritage', duration:'1 hr', description:'A remarkable feat of engineering where the train spirals underground and resurfaces above where it just passed.' },
  ],
  d23: [ // Monaragala
    { id:'p1', name:'Maligawila Buddha Statue', type:'Heritage', duration:'1.5 hrs', description:'A stunning 11 m 7th-century standing Buddha carved from a single dolomite stone — the tallest ancient stone statue in Sri Lanka.' },
    { id:'p2', name:'Buduruwagala Rock Temple', type:'Heritage', duration:'1.5 hrs', description:'Seven giant 9th-century Mahayana Buddhist rock reliefs carved into a jungle cliff — a hidden masterpiece of the ancient world.' },
    { id:'p3', name:'Gal Oya National Park', type:'Safari', duration:'Half day', description:'The only boat safari in Sri Lanka — glide silently past bathing elephants swimming between islands in a vast reservoir.' },
    { id:'p4', name:'Wellawaya Valley', type:'Viewpoint', duration:'2 hrs', description:'A scenic lowland plain framed by rock outcrops and paddy fields — an exceptional viewpoint on the Ella-Hambantota road pass.' },
    { id:'p5', name:'Inginiyagala Dam', type:'Nature', duration:'1 hr', description:'A large earth dam and reservoir forming the centrepiece of an important irrigation and birding area.' },
  ],
  d24: [ // Ratnapura
    { id:"p1", name:"Adam's Peak (Sri Pada)", type:'Heritage', duration:'5–6 hrs', description:'A pre-dawn pilgrimage hike of 5,500 steps to a summit sacred to four religions — rewarded with a sunrise above the clouds.' },
    { id:'p2', name:'Sinharaja Forest Reserve', type:'Nature', duration:'Half day', description:'A UNESCO Biosphere Reserve and the last viable primary rainforest in Sri Lanka — a birdwatcher\'s paradise with 21 endemic species.' },
    { id:'p3', name:'Ratnapura Gem Museum', type:'Museum', duration:'1.5 hrs', description:'Discover Sri Lanka\'s centuries-old gem industry — blue sapphires, cat\'s eyes and rubies all mined from these red soils.' },
    { id:'p4', name:'Maha Saman Devalaya', type:'Temple', duration:'1 hr', description:'The principal shrine of Saman — a guardian deity of Sri Lanka — situated in a lush river valley near Ratnapura town.' },
    { id:'p5', name:'Bopath Falls', type:'Nature', duration:'1 hr', description:'A 30 m waterfall that fans into a Bo-leaf shape as it tumbles — one of the most photographed falls in Sri Lanka.' },
  ],
  d25: [ // Kegalle
    { id:'p1', name:'White Water Rafting, Kitulgala', type:'Adventure', duration:'3 hrs', description:'Sri Lanka\'s premier rafting destination on the Kelani River — grade 3–4 rapids through jungle gorges (October–April).' },
    { id:'p2', name:'Belilena Cave', type:'Heritage', duration:'1.5 hrs', description:'A prehistoric cave shelter containing evidence of human habitation going back 37,000 years, with an on-site museum.' },
    { id:'p3', name:'Bridge on the River Kwai Site', type:'Heritage', duration:'1 hr', description:'David Lean\'s 1957 Oscar-winning film was shot on the Kelani River near Kitulgala — the original bridge is gone but the river is stunning.' },
    { id:'p4', name:'Rambukkana', type:'Heritage', duration:'1 hr', description:'Famous for its steep railway incline; watch the steam engine helpers push carriages up the dramatic Kadugannawa Pass.' },
    { id:'p5', name:'Ambuluwawa Tower', type:'Viewpoint', duration:'2 hrs', description:'A multi-religious tower atop a 1,021 m biodiversity complex, visible from Kandy and offering spectacular views.' },
  ],
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
}

function typePill(type) {
  const c = TYPE_COLOURS[type] || { bg: '#F3F4F6', text: '#374151', border: '#E5E7EB' }
  return { background: c.bg, color: c.text, border: `1px solid ${c.border}` }
}

/* ─── AI Suggestions panel ─── */
function AISuggestions({ district, selectedPlaces }) {
  const [status, setStatus]       = useState('idle')   // idle | loading | done | error
  const [tips,   setTips]         = useState([])
  const [itinerary, setItinerary] = useState('')

  const generate = async () => {
    setStatus('loading')
    setTips([])
    setItinerary('')
    try {
      const res = await fetch('http://localhost:5000/api/ai/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          district: district.name,
          province: district.province,
          places: selectedPlaces.map(p => p.name),
          bestFor: district.bestFor,
        }),
      })
      if (!res.ok) throw new Error('AI unavailable')
      const data = await res.json()
      setTips(data.tips || [])
      setItinerary(data.itinerary || '')
      setStatus('done')
    } catch {
      // Local fallback based on district data
      setTips(buildLocalTips(district, selectedPlaces))
      setItinerary(buildLocalItinerary(district, selectedPlaces))
      setStatus('done')
    }
  }

  return (
    <aside className="de-ai-panel">
      <div className="de-ai-header">
        <span className="de-ai-icon">✦</span>
        <div>
          <h3>AI Travel Suggestions</h3>
          <p>Get a personalised itinerary & tips for {district.name}</p>
        </div>
      </div>

      {status === 'idle' && (
        <div className="de-ai-idle">
          <div className="de-ai-idle-hints">
            <span>🗓 Smart day-by-day itinerary</span>
            <span>💡 Local insider tips</span>
            <span>⏱ Visit time estimates</span>
            <span>🌤 Best season advice</span>
          </div>
          <button
            className="de-ai-btn"
            onClick={generate}
            disabled={selectedPlaces.length === 0}
          >
            {selectedPlaces.length === 0
              ? 'Select places first'
              : `Generate suggestions for ${selectedPlaces.length} place${selectedPlaces.length !== 1 ? 's' : ''}`
            }
          </button>
        </div>
      )}

      {status === 'loading' && (
        <div className="de-ai-loading">
          <div className="de-ai-dots">
            <span /><span /><span />
          </div>
          <p>Crafting your personalised plan…</p>
        </div>
      )}

      {status === 'done' && (
        <div className="de-ai-results">
          {itinerary && (
            <div className="de-ai-section">
              <h4>📅 Suggested Itinerary</h4>
              <div className="de-ai-itinerary">
                {itinerary.split('\n').filter(Boolean).map((line, i) => (
                  <p key={i} className={line.startsWith('Day') ? 'de-ai-day' : 'de-ai-item'}>{line}</p>
                ))}
              </div>
            </div>
          )}
          {tips.length > 0 && (
            <div className="de-ai-section">
              <h4>💡 Insider Tips</h4>
              <ul className="de-ai-tips">
                {tips.map((t, i) => <li key={i}>{t}</li>)}
              </ul>
            </div>
          )}
          <button className="de-ai-regen" onClick={generate}>↺ Regenerate</button>
        </div>
      )}

      {status === 'error' && (
        <div className="de-ai-error">
          <p>Something went wrong. Please try again.</p>
          <button className="de-ai-btn" onClick={generate}>Retry</button>
        </div>
      )}
    </aside>
  )
}

/* ─── Local AI fallback builders ─── */
function buildLocalTips(district, places) {
  const tips = [
    `Start your visit to ${district.name} early in the morning to beat the crowds at popular sites.`,
    `${district.name} is in the ${district.province} Province — check the seasonal weather pattern before booking dates.`,
    places.some(p => p.type === 'Temple') ? 'Bring a sarong when visiting temples — shoulders and knees must be covered.' : null,
    places.some(p => p.type === 'Safari' || p.type === 'Wildlife') ? 'Book safari jeeps in advance during peak season (December–April).' : null,
    places.some(p => p.type === 'Beach') ? 'Best swimming conditions are typically from November to April on the south/west coasts, May to September on the east.' : null,
    `Hiring a local tuk-tuk driver for the day in ${district.name} is cost-effective and they know hidden local spots.`,
    'Always carry sufficient cash — many rural attractions and small eateries in Sri Lanka do not accept cards.',
    places.some(p => p.type === 'Heritage') ? 'Consider hiring a licensed Archaeological Guide at UNESCO sites for much deeper historical insight.' : null,
  ].filter(Boolean)
  return tips.slice(0, 5)
}

function buildLocalItinerary(district, places) {
  if (places.length === 0) return ''
  const morning   = places.slice(0, Math.ceil(places.length / 2))
  const afternoon = places.slice(Math.ceil(places.length / 2))
  const lines = [
    `Day 1 — ${district.name} District`,
    `Morning: ${morning.map(p => p.name).join(', ')}`,
    `Afternoon: ${afternoon.map(p => p.name).join(', ')}`,
    `Evening: Enjoy local cuisine at a waterfront or town-centre restaurant.`,
  ]
  if (places.length > 4) {
    lines.push(`Day 2 — ${district.name} (extended)`)
    lines.push(`Explore surrounding villages, local markets and hidden scenic viewpoints.`)
  }
  return lines.join('\n')
}

/* ─── Place Card ─── */
function PlaceCard({ place, districtId, selected, onToggle }) {
  const [showReviews, setShowReviews] = useState(false)
  const reviewId = `${districtId}_${place.id}`

  return (
    <div className={`de-place-card ${selected ? 'selected' : ''}`}>
      <div className="de-place-card-clickable" onClick={() => onToggle(place)}>
        <div className="de-place-card-top">
          <span className="de-place-type" style={typePill(place.type)}>{place.type}</span>
          <span className="de-place-duration">⏱ {place.duration}</span>
        </div>
        <h4 className="de-place-name">{place.name}</h4>
        <p className="de-place-desc">{place.description}</p>
        <div className="de-place-footer">
          <span className={`de-tick ${selected ? 'checked' : ''}`}>
            {selected ? '✓ Added to trip' : '+ Add to trip'}
          </span>
          <button
            className="de-reviews-toggle"
            onClick={e => { e.stopPropagation(); setShowReviews(s => !s) }}
          >
            {showReviews ? '✕ Hide reviews' : '⭐ Reviews'}
          </button>
        </div>
      </div>
      {showReviews && (
        <div className="de-reviews-panel" onClick={e => e.stopPropagation()}>
          <ReviewSection
            targetType="place"
            targetId={reviewId}
            targetName={place.name}
            dbId={null}
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

  useEffect(() => {
    const raw = localStorage.getItem('selectedDistrict')
    if (!raw) { navigate('/plan-trip'); return }
    setDistrict(JSON.parse(raw))
  }, [navigate])

  const handleLogout = () => {
    localStorage.removeItem('currentUser')
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

  const handleContinue = () => {
    // Store both the district and the selected places
    localStorage.setItem('selectedDistrict', JSON.stringify(district))
    localStorage.setItem('selectedPlaces', JSON.stringify(selectedPlaces))
    navigate('/hotel-picker')
  }

  return (
    <div className="de-page">
      {/* ── Nav ── */}
      <nav className="dashboard-nav glass-nav">
        <div className="nav-container">
          <Link to="/" className="logo">Travel<span>Genie</span></Link>
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
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
            <button className="btn-logout" onClick={handleLogout}>Log Out</button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="de-hero">
        <div className="de-hero-inner">
          {/* Breadcrumb steps */}
          <div className="de-steps">
            <div className="de-step done" onClick={() => navigate('/plan-trip')}>
              <span className="de-step-num">1</span>
              <span className="de-step-label">District</span>
            </div>
            <div className="de-step-line done" />
            <div className="de-step active">
              <span className="de-step-num">2</span>
              <span className="de-step-label">Places</span>
            </div>
            <div className="de-step-line" />
            <div className="de-step">
              <span className="de-step-num">3</span>
              <span className="de-step-label">Hotel</span>
            </div>
            <div className="de-step-line" />
            <div className="de-step">
              <span className="de-step-num">4</span>
              <span className="de-step-label">Details</span>
            </div>
          </div>

          <p className="de-eyebrow">📍 {district.province} Province</p>
          <h1>Explore <em>{district.name}</em></h1>
          <p className="de-hero-sub">{district.description}</p>

          <div className="de-best-for">
            {district.bestFor.map(b => (
              <span key={b} className="de-best-chip">{b}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Body ── */}
      <div className="de-body">

        {/* ── Left: Places ── */}
        <main className="de-main">
          <div className="de-section-header">
            <div>
              <h2>Places to Visit</h2>
              <p className="de-section-sub">
                Select the spots you want to include in your trip
                {selectedPlaces.length > 0 && (
                  <span className="de-selected-badge"> · {selectedPlaces.length} selected</span>
                )}
              </p>
            </div>

            {/* Type filter */}
            <div className="de-type-filter">
              {types.map(t => (
                <button
                  key={t}
                  className={`de-type-pill ${filterType === t ? 'active' : ''}`}
                  onClick={() => setFilterType(t)}
                  style={t !== 'All' && filterType !== t ? { borderColor: (TYPE_COLOURS[t]?.border || '#E5E7EB') } : {}}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="de-places-grid">
            {visiblePlaces.map(place => (
              <PlaceCard
                key={place.id}
                place={place}
                districtId={district.id}
                selected={!!selectedPlaces.find(p => p.id === place.id)}
                onToggle={togglePlace}
              />
            ))}
          </div>

          {/* ── Selection summary + CTA ── */}
          <div className="de-cta-bar">
            <div className="de-cta-summary">
              {selectedPlaces.length === 0
                ? <span>No places selected yet — tap a card to add</span>
                : <span><strong>{selectedPlaces.length}</strong> place{selectedPlaces.length !== 1 ? 's' : ''} selected: {selectedPlaces.map(p => p.name).join(', ')}</span>
              }
            </div>
            <div className="de-cta-btns">
              <button className="de-back-btn" onClick={() => navigate('/plan-trip')}>
                ← Change District
              </button>
              <button
                className="de-continue-btn"
                onClick={handleContinue}
              >
                Continue to Hotels
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="5" y1="12" x2="19" y2="12"/>
                  <polyline points="12,5 19,12 12,19"/>
                </svg>
              </button>
            </div>
          </div>
        </main>

        {/* ── Right: AI Suggestions ── */}
        <AISuggestions district={district} selectedPlaces={selectedPlaces} />
      </div>
    </div>
  )
}

export default DistrictExplore
