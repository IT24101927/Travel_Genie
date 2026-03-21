import { useState, useEffect } from 'react'
import { clearUserData } from '../../utils/clearUserData'
import { API_BASE } from '../../config/api'
import { Link, useNavigate } from 'react-router-dom'
import ReviewSection from './ReviewSection'
import './HotelPicker.css'

/* ─── Fallback hotel data keyed by city name (lower-case) ─── */
const FALLBACK_HOTELS = {
  sigiriya: [
    {
      _id: 'hs1', name: 'Sigiriya Rock Retreat', category: 'resort', starRating: 5,
      priceRange: { min: 180, max: 350, currency: 'USD' },
      address: { city: 'Sigiriya', country: 'Sri Lanka' },
      description: 'A luxury eco-resort with breath-taking views of the iconic Sigiriya Rock. Infinity pool, forest walks and farm-to-table dining.',
      amenities: ['pool', 'spa', 'restaurant', 'wifi', 'gym'],
      images: [{ url: 'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=600&q=80' }]
    },
    {
      _id: 'hs2', name: 'Jetwing Vil Uyana', category: 'boutique', starRating: 4,
      priceRange: { min: 120, max: 220, currency: 'USD' },
      address: { city: 'Sigiriya', country: 'Sri Lanka' },
      description: 'Boutique chalets surrounded by wetland and forest ecosystem, offering guided wildlife safaris and cultural excursions.',
      amenities: ['pool', 'restaurant', 'wifi', 'airport-shuttle'],
      images: [{ url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=80' }]
    },
    {
      _id: 'hs3', name: 'Sigiriya Guest Garden', category: 'guesthouse', starRating: 3,
      priceRange: { min: 40, max: 80, currency: 'USD' },
      address: { city: 'Sigiriya', country: 'Sri Lanka' },
      description: 'A cosy guesthouse set in lush gardens, just 2 km from the Rock Fortress. Perfect for budget travellers.',
      amenities: ['wifi', 'parking', 'restaurant'],
      images: [{ url: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=600&q=80' }]
    }
  ],
  galle: [
    {
      _id: 'hg1', name: 'Amangalla', category: 'boutique', starRating: 5,
      priceRange: { min: 600, max: 1200, currency: 'USD' },
      address: { city: 'Galle', country: 'Sri Lanka' },
      description: 'An iconic heritage hotel inside the Galle Fort walls. Colonial grandeur, lush courtyards and an Ayurvedic spa.',
      amenities: ['spa', 'pool', 'restaurant', 'wifi', 'concierge'],
      images: [{ url: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=600&q=80' }]
    },
    {
      _id: 'hg2', name: 'The Fort Printers', category: 'boutique', starRating: 4,
      priceRange: { min: 200, max: 380, currency: 'USD' },
      address: { city: 'Galle', country: 'Sri Lanka' },
      description: 'A boutique gem in a restored 18th-century printing house within the Fort — seven exquisite rooms, beautiful pool, fine dining.',
      amenities: ['pool', 'restaurant', 'wifi', 'bar'],
      images: [{ url: 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=600&q=80' }]
    },
    {
      _id: 'hg3', name: 'Closenberg Hotel', category: 'hotel', starRating: 3,
      priceRange: { min: 70, max: 130, currency: 'USD' },
      address: { city: 'Galle', country: 'Sri Lanka' },
      description: 'A charming colonial villa overlooking the harbour. Spacious rooms, sea breeze and a warm Sri Lankan welcome.',
      amenities: ['pool', 'restaurant', 'wifi', 'parking'],
      images: [{ url: 'https://images.unsplash.com/photo-1496417263034-38ec4f0b665a?w=600&q=80' }]
    }
  ],
  mirissa: [
    {
      _id: 'hm1', name: 'Mirissa Hills', category: 'villa', starRating: 5,
      priceRange: { min: 250, max: 500, currency: 'USD' },
      address: { city: 'Mirissa', country: 'Sri Lanka' },
      description: 'Six exclusive villas perched on a hill with panoramic ocean views. Private pool, tropical gardens and curated experiences.',
      amenities: ['pool', 'spa', 'wifi', 'restaurant', 'concierge'],
      images: [{ url: 'https://images.unsplash.com/photo-1573052905904-34ad8c27f0cc?w=600&q=80' }]
    },
    {
      _id: 'hm2', name: 'Weligama Bay Marriott', category: 'resort', starRating: 4,
      priceRange: { min: 150, max: 300, currency: 'USD' },
      address: { city: 'Mirissa', country: 'Sri Lanka' },
      description: 'Contemporary beachfront resort with multiple pools, sunset bar and world-class diving and surf packages.',
      amenities: ['pool', 'spa', 'restaurant', 'bar', 'gym', 'wifi'],
      images: [{ url: 'https://images.unsplash.com/photo-1561501900-3701fa6a0864?w=600&q=80' }]
    },
    {
      _id: 'hm3', name: 'Polhena Reef Rooms', category: 'guesthouse', starRating: 3,
      priceRange: { min: 45, max: 90, currency: 'USD' },
      address: { city: 'Mirissa', country: 'Sri Lanka' },
      description: 'Casual beachside guesthouse steps from the reef. Snorkelling gear rental, bike hire and great local seafood.',
      amenities: ['wifi', 'restaurant', 'parking'],
      images: [{ url: 'https://images.unsplash.com/photo-1455587734955-081b22074882?w=600&q=80' }]
    }
  ],
  ella: [
    {
      _id: 'he1', name: '98 Acres Resort & Spa', category: 'resort', starRating: 5,
      priceRange: { min: 200, max: 450, currency: 'USD' },
      address: { city: 'Ella', country: 'Sri Lanka' },
      description: 'A stunning hilltop resort spread across 98 acres of tea estate. Panoramic infinity pool, Ayurvedic spa and organic cuisine.',
      amenities: ['pool', 'spa', 'restaurant', 'wifi', 'gym'],
      images: [{ url: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=600&q=80' }]
    },
    {
      _id: 'he2', name: 'Zion View Ella', category: 'boutique', starRating: 4,
      priceRange: { min: 100, max: 200, currency: 'USD' },
      address: { city: 'Ella', country: 'Sri Lanka' },
      description: 'Boutique property with sweeping valley views, outdoor jacuzzi and curated hiking and train experiences.',
      amenities: ['pool', 'restaurant', 'wifi', 'airport-shuttle'],
      images: [{ url: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=600&q=80' }]
    },
    {
      _id: 'he3', name: 'Ella Flower Garden Resort', category: 'hotel', starRating: 3,
      priceRange: { min: 55, max: 100, currency: 'USD' },
      address: { city: 'Ella', country: 'Sri Lanka' },
      description: 'Cosy mountain hotel surrounded by flowers and tea bushes. Perfect base for Nine Arch Bridge and Little Adam\'s Peak hikes.',
      amenities: ['wifi', 'restaurant', 'parking'],
      images: [{ url: 'https://images.unsplash.com/photo-1563911302283-d2bc129e7570?w=600&q=80' }]
    }
  ],
  kandy: [
    {
      _id: 'hk1', name: 'The Grand Hotel Kandy', category: 'hotel', starRating: 5,
      priceRange: { min: 200, max: 400, currency: 'USD' },
      address: { city: 'Kandy', country: 'Sri Lanka' },
      description: 'Colonial-era luxury hotel overlooking Kandy Lake and the Temple of the Tooth. Elegant rooms, fine dining and cultural shows.',
      amenities: ['pool', 'spa', 'restaurant', 'wifi', 'bar', 'gym'],
      images: [{ url: 'https://images.unsplash.com/photo-1561501878-aabd62634533?w=600&q=80' }]
    },
    {
      _id: 'hk2', name: 'Earl\'s Regency', category: 'resort', starRating: 4,
      priceRange: { min: 110, max: 220, currency: 'USD' },
      address: { city: 'Kandy', country: 'Sri Lanka' },
      description: 'Hillside resort with panoramic views of the Hanthana range, outdoor pool terrace and curated cultural experiences.',
      amenities: ['pool', 'restaurant', 'wifi', 'gym', 'spa'],
      images: [{ url: 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=600&q=80' }]
    },
    {
      _id: 'hk3', name: 'Kandy Cottage', category: 'guesthouse', starRating: 3,
      priceRange: { min: 40, max: 75, currency: 'USD' },
      address: { city: 'Kandy', country: 'Sri Lanka' },
      description: 'Homely guesthouse within walking distance of the Temple of the Tooth. Homemade Sri Lankan breakfasts and warm hospitality.',
      amenities: ['wifi', 'restaurant', 'parking'],
      images: [{ url: 'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?w=600&q=80' }]
    }
  ],
  default: [
    {
      _id: 'hd1', name: 'Paradise Bay Resort', category: 'resort', starRating: 5,
      priceRange: { min: 220, max: 450, currency: 'USD' },
      address: { city: '', country: 'Sri Lanka' },
      description: 'A world-class luxury resort offering impeccable service, ocean views and holistic wellness experiences.',
      amenities: ['pool', 'spa', 'restaurant', 'wifi', 'gym', 'bar'],
      images: [{ url: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=600&q=80' }]
    },
    {
      _id: 'hd2', name: 'Ceylon Heritage Hotel', category: 'boutique', starRating: 4,
      priceRange: { min: 130, max: 260, currency: 'USD' },
      address: { city: '', country: 'Sri Lanka' },
      description: 'Boutique hotel blending Sri Lankan heritage architecture with modern comforts. Curated local experiences and farm dining.',
      amenities: ['pool', 'restaurant', 'wifi', 'concierge', 'spa'],
      images: [{ url: 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=600&q=80' }]
    },
    {
      _id: 'hd3', name: 'Tropical Tree House', category: 'villa', starRating: 4,
      priceRange: { min: 160, max: 320, currency: 'USD' },
      address: { city: '', country: 'Sri Lanka' },
      description: 'Private villas enveloped in rainforest canopy. Plunge pools, bespoke jungle safaris and stargazing decks.',
      amenities: ['pool', 'wifi', 'restaurant', 'spa', 'airport-shuttle'],
      images: [{ url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=80' }]
    },
    {
      _id: 'hd4', name: 'Island Breeze Inn', category: 'hotel', starRating: 3,
      priceRange: { min: 65, max: 120, currency: 'USD' },
      address: { city: '', country: 'Sri Lanka' },
      description: 'Comfortable mid-range hotel in a convenient location. Clean rooms, friendly staff and great home-cooked meals.',
      amenities: ['wifi', 'restaurant', 'parking', '24-hour-front-desk'],
      images: [{ url: 'https://images.unsplash.com/photo-1496417263034-38ec4f0b665a?w=600&q=80' }]
    }
  ]
}

/* ─── Per-district hotel data keyed by district id (d1–d25) ─── */
export const HOTELS_BY_DISTRICT = {
  // Colombo (d1)
  d1: [
    { _id:'hc1', name:'Cinnamon Grand Colombo', category:'hotel', starRating:5, priceRange:{min:180,max:380,currency:'USD'}, address:{city:'Colombo',country:'Sri Lanka'}, description:'Iconic 5-star landmark in the heart of Colombo — close to Viharamahadevi Park, Gangaramaya Temple, Galle Face Green and the National Museum.', amenities:['pool','spa','restaurant','wifi','gym','bar'], images:[{url:'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=600&q=80'}] },
    { _id:'hc2', name:'The Kingsbury Colombo', category:'hotel', starRating:5, priceRange:{min:160,max:320,currency:'USD'}, address:{city:'Colombo 01',country:'Sri Lanka'}, description:'Stylish waterfront hotel steps from Galle Face Green with a rooftop bar. Centrally placed for Independence Hall, Pettah Market and Gangaramaya.', amenities:['pool','restaurant','wifi','gym','bar','spa'], images:[{url:'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=600&q=80'}] },
    { _id:'hc3', name:'City Hotel Colombo', category:'hotel', starRating:3, priceRange:{min:55,max:110,currency:'USD'}, address:{city:'Colombo 03',country:'Sri Lanka'}, description:'Practical mid-range hotel with quick access to Independence Hall, Gangaramaya Temple and Pettah bazaar.', amenities:['wifi','restaurant','parking','24-hour-front-desk'], images:[{url:'https://images.unsplash.com/photo-1496417263034-38ec4f0b665a?w=600&q=80'}] },
    { _id:'hc4', name:'Galle Face Hotel', category:'hotel', starRating:5, priceRange:{min:200,max:450,currency:'USD'}, address:{city:'Colombo',country:'Sri Lanka'}, description:'Sri Lanka’s iconic historic hotel, established in 1864, situated directly on the seafront facing the Galle Face Green.', amenities:['pool','spa','restaurant','bar','museum'], images:[{url:'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=80'}] },
    { _id:'hc5', name:'Shangri-La Colombo', category:'resort', starRating:5, priceRange:{min:250,max:500,currency:'USD'}, address:{city:'Colombo',country:'Sri Lanka'}, description:'Premier luxury hotel with views of the Indian Ocean and Beira Lake, connected to the One Galle Face Mall.', amenities:['pool','spa','restaurant','gym','shopping'], images:[{url:'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=600&q=80'}] },
    { _id:'hc6', name:'Marino Beach Colombo', category:'hotel', starRating:4, priceRange:{min:90,max:180,currency:'USD'}, address:{city:'Colombo',country:'Sri Lanka'}, description:'Modern hotel featuring a massive rooftop infinity pool and garden, perfect for sunset views over the ocean.', amenities:['pool','restaurant','bar','wifi','parking'], images:[{url:'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=600&q=80'}] },
    { _id:'hc7', name:'Cinnamon Red', category:'hotel', starRating:3, priceRange:{min:70,max:140,currency:'USD'}, address:{city:'Colombo 03',country:'Sri Lanka'}, description:'Trendy lean luxury hotel with a rooftop pool and bar, showcasing vibrant city art and panoramic views.', amenities:['pool','restaurant','bar','wifi','gym'], images:[{url:'https://images.unsplash.com/photo-1496417263034-38ec4f0b665a?w=600&q=80'}] },
  ],
  // Gampaha (d2)
  d2: [
    { _id:'hgp1', name:'Pinnawala Elephant Watch Hotel', category:'boutique', starRating:4, priceRange:{min:90,max:175,currency:'USD'}, address:{city:'Pinnawala',country:'Sri Lanka'}, description:'Balcony rooms directly overlooking the river where Pinnawala elephants bathe twice daily — the definitive stay near the Orphanage.', amenities:['restaurant','wifi','parking','airport-shuttle'], images:[{url:'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=80'}] },
    { _id:'hgp2', name:'Heritance Kandalama', category:'resort', starRating:5, priceRange:{min:170,max:340,currency:'USD'}, address:{city:'Dambulla',country:'Sri Lanka'}, description:'Geoffrey Bawa masterpiece built into a cliff face. Day trips to Pinnawala, Henarathgoda Botanical Garden and Bolgoda Lake.', amenities:['pool','spa','restaurant','wifi','gym'], images:[{url:'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=600&q=80'}] },
    { _id:'hgp3', name:'Bolgoda Lake Hotel', category:'hotel', starRating:3, priceRange:{min:45,max:85,currency:'USD'}, address:{city:'Gampaha',country:'Sri Lanka'}, description:'Lakeside hotel within easy reach of Henarathgoda Botanical Garden and Bolgoda Lake boat trails.', amenities:['wifi','restaurant','parking'], images:[{url:'https://images.unsplash.com/photo-1563911302283-d2bc129e7570?w=600&q=80'}] },
    { _id:'hgp4', name:'Wallawwa', category:'boutique', starRating:5, priceRange:{min:200,max:400,currency:'USD'}, address:{city:'Kotugoda',country:'Sri Lanka'}, description:'Considered one of the finest boutique hotels in Sri Lanka, this renovated manor house offers tranquility near the airport.', amenities:['pool','spa','restaurant','garden'], images:[{url:'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=600&q=80'}] },
    { _id:'hgp5', name:'Wet Water Resort', category:'hotel', starRating:3, priceRange:{min:40,max:80,currency:'USD'}, address:{city:'Gampaha',country:'Sri Lanka'}, description:'Local favorite for family outings with a large pool and water activities, set in the lush Gampaha greenery.', amenities:['pool','restaurant','parking'], images:[{url:'https://images.unsplash.com/photo-1455587734955-081b22074882?w=600&q=80'}] },
  ],
  // Kalutara (d3)
  d3: [
    { _id:'hkl1', name:'Tangerine Beach Hotel', category:'resort', starRating:4, priceRange:{min:120,max:240,currency:'USD'}, address:{city:'Kalutara',country:'Sri Lanka'}, description:'Beachfront resort on Kalutara\'s golden coast. Close to Kalutara Bodhiya, Richmond Castle, Bentota River and Beruwala Lighthouse.', amenities:['pool','spa','restaurant','wifi','gym'], images:[{url:'https://images.unsplash.com/photo-1561501900-3701fa6a0864?w=600&q=80'}] },
    { _id:'hkl2', name:'Lunuganga Estate Bungalow', category:'boutique', starRating:5, priceRange:{min:280,max:550,currency:'USD'}, address:{city:'Bentota',country:'Sri Lanka'}, description:'Stay in Geoffrey Bawa\'s iconic private estate on the Bentota River — the landscape garden and Beruwala Lighthouse are close by.', amenities:['pool','restaurant','wifi','concierge'], images:[{url:'https://images.unsplash.com/photo-1573052905904-34ad8c27f0cc?w=600&q=80'}] },
    { _id:'hkl3', name:'Kithala Resort Kalutara', category:'hotel', starRating:3, priceRange:{min:50,max:95,currency:'USD'}, address:{city:'Kalutara',country:'Sri Lanka'}, description:'Mid-range hotel near Kalutara Beach and the Bodhiya. Easy access to Bentota River safaris and Beruwala Lighthouse.', amenities:['wifi','restaurant','parking','pool'], images:[{url:'https://images.unsplash.com/photo-1455587734955-081b22074882?w=600&q=80'}] },
    { _id:'hkl4', name:'Anantara Kalutara Resort', category:'resort', starRating:5, priceRange:{min:250,max:500,currency:'USD'}, address:{city:'Kalutara',country:'Sri Lanka'}, description:'Luxury sanctuary where the Kalu Ganga River meets the Indian Ocean, featuring Geoffrey Bawa architecture.', amenities:['pool','spa','restaurant','bar','library'], images:[{url:'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=600&q=80'}] },
    { _id:'hkl5', name:'Avani Kalutara Resort', category:'resort', starRating:4, priceRange:{min:100,max:200,currency:'USD'}, address:{city:'Kalutara',country:'Sri Lanka'}, description:'Contemporary resort located on a peninsula where the river meets the sea, offering water sports and relaxation.', amenities:['pool','gym','water-sports','restaurant'], images:[{url:'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=80'}] },
  ],
  // Kandy (d4)
  d4: [
    { _id:'hk1', name:'The Grand Hotel Kandy', category:'hotel', starRating:5, priceRange:{min:200,max:400,currency:'USD'}, address:{city:'Kandy',country:'Sri Lanka'}, description:'Colonial-era luxury hotel overlooking Kandy Lake, steps from the Temple of the Tooth, Udawatta Kele and the Kandyan Cultural Show.', amenities:['pool','spa','restaurant','wifi','bar','gym'], images:[{url:'https://images.unsplash.com/photo-1561501878-aabd62634533?w=600&q=80'}] },
    { _id:'hk2', name:"Earl's Regency Kandy", category:'resort', starRating:4, priceRange:{min:110,max:220,currency:'USD'}, address:{city:'Kandy',country:'Sri Lanka'}, description:'Hillside resort with panoramic mountain views. Short drives to Peradeniya Botanical Gardens, Bahirawakanda Buddha and Udawatta Kele.', amenities:['pool','restaurant','wifi','gym','spa'], images:[{url:'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=600&q=80'}] },
    { _id:'hk3', name:'Kandy Cottage', category:'guesthouse', starRating:3, priceRange:{min:40,max:75,currency:'USD'}, address:{city:'Kandy',country:'Sri Lanka'}, description:'Homely guesthouse walking distance from the Temple of the Tooth. Homemade Sri Lankan breakfasts and warm local hospitality.', amenities:['wifi','restaurant','parking'], images:[{url:'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?w=600&q=80'}] },
    { _id:'hk4', name:'Helga\'s Folly', category:'boutique', starRating:3, priceRange:{min:80,max:150,currency:'USD'}, address:{city:'Kandy',country:'Sri Lanka'}, description:'An eccentric, art-filled hotel nestled in the jungle above Kandy Lake. A truly unique, surreal experience.', amenities:['restaurant','wifi','pool','art-gallery'], images:[{url:'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=600&q=80'}] },
    { _id:'hk5', name:'Mahaweli Reach Hotel', category:'hotel', starRating:5, priceRange:{min:150,max:300,currency:'USD'}, address:{city:'Kandy',country:'Sri Lanka'}, description:'Grand colonial-style hotel along the Mahaweli River, offering boat rides and traditional Kandyan hospitality.', amenities:['pool','spa','cruise','restaurant'], images:[{url:'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=600&q=80'}] },
    { _id:'hk6', name:'OZO Kandy', category:'hotel', starRating:4, priceRange:{min:90,max:180,currency:'USD'}, address:{city:'Kandy',country:'Sri Lanka'}, description:'Modern chic hotel with a rooftop pool and lounge offering sweeping views of Kandy Lake and the hills.', amenities:['pool','bar','wifi','restaurant'], images:[{url:'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=600&q=80'}] },
  ],
  // Matale (d5)
  d5: [
    { _id:'hmt1', name:'Sigiriya Village Hotel', category:'resort', starRating:4, priceRange:{min:130,max:260,currency:'USD'}, address:{city:'Sigiriya',country:'Sri Lanka'}, description:'Eco-resort near Nalanda Gedige. Day trips to Aluvihara Rock Temple, Sri Muthumariamman Kovil and Matale spice gardens.', amenities:['pool','restaurant','wifi','airport-shuttle'], images:[{url:'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=600&q=80'}] },
    { _id:'hmt2', name:'Jetwing Vil Uyana', category:'boutique', starRating:5, priceRange:{min:180,max:380,currency:'USD'}, address:{city:'Sigiriya',country:'Sri Lanka'}, description:'Luxury wetland chalets. Day-trip distance to Aluvihara Rock Temple, Muthumariamman Kovil and Matale spice gardens.', amenities:['pool','spa','restaurant','wifi'], images:[{url:'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=600&q=80'}] },
    { _id:'hmt3', name:'Matale Rest House', category:'guesthouse', starRating:3, priceRange:{min:30,max:60,currency:'USD'}, address:{city:'Matale',country:'Sri Lanka'}, description:'Simple guesthouse in Matale town, a short ride from Muthumariamman Temple, Aluvihara caves and Nalanda Gedige.', amenities:['wifi','restaurant','parking'], images:[{url:'https://images.unsplash.com/photo-1563911302283-d2bc129e7570?w=600&q=80'}] },
    { _id:'hmt4', name:'Hunas Falls Hotel', category:'hotel', starRating:4, priceRange:{min:120,max:220,currency:'USD'}, address:{city:'Elkaduwa',country:'Sri Lanka'}, description:'Scenic hotel set amidst tea plantations, waterfalls, and a mini golf course, high in the hills above Matale.', amenities:['pool','golf','restaurant','garden'], images:[{url:'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=80'}] },
    { _id:'hmt5', name:'Aarunya Nature Resort', category:'boutique', starRating:5, priceRange:{min:220,max:400,currency:'USD'}, address:{city:'Kandy/Matale Border',country:'Sri Lanka'}, description:'Private pool villas overlooking the Knuckles Mountain Range. A sanctuary for relaxation and nature lovers.', amenities:['pool','spa','restaurant','yoga'], images:[{url:'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=600&q=80'}] },
  ],
  // Nuwara Eliya (d6)
  d6: [
    { _id:'hne1', name:'The Grand Hotel Nuwara Eliya', category:'hotel', starRating:5, priceRange:{min:160,max:320,currency:'USD'}, address:{city:'Nuwara Eliya',country:'Sri Lanka'}, description:"A legendary colonial hotel from 1891, moments from Gregory Lake and Hakgala Gardens. Horton Plains and World's End are a short drive.", amenities:['restaurant','wifi','spa','bar','gym'], images:[{url:'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=600&q=80'}] },
    { _id:'hne2', name:'Heritance Tea Factory', category:'boutique', starRating:4, priceRange:{min:150,max:300,currency:'USD'}, address:{city:'Kandapola',country:'Sri Lanka'}, description:"A converted century-old tea factory at 1,900 m — iconic for Moon Plains walkers, World's End hikers and Pedro Tea Estate visitors.", amenities:['restaurant','wifi','spa','bar'], images:[{url:'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=600&q=80'}] },
    { _id:'hne3', name:'Tea Bush Hotel', category:'hotel', starRating:3, priceRange:{min:60,max:120,currency:'USD'}, address:{city:'Nuwara Eliya',country:'Sri Lanka'}, description:'Cosy hotel within walking distance of Gregory Lake, Pedro Tea Estate and Seetha Amman Temple.', amenities:['wifi','restaurant','parking'], images:[{url:'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=600&q=80'}] },
    { _id:'hne4', name:'Jetwing St. Andrew\'s', category:'hotel', starRating:5, priceRange:{min:180,max:350,currency:'USD'}, address:{city:'Nuwara Eliya',country:'Sri Lanka'}, description:'Old-world charm in a restored Georgian mansion. Features high tea on the lawn and guided nature walks.', amenities:['restaurant','bar','garden','pool'], images:[{url:'https://images.unsplash.com/photo-1561501900-3701fa6a0864?w=600&q=80'}] },
    { _id:'hne5', name:'Araliya Green City', category:'hotel', starRating:5, priceRange:{min:140,max:280,currency:'USD'}, address:{city:'Nuwara Eliya',country:'Sri Lanka'}, description:'Modern luxury hotel in the city center with a heated pool and easy access to Victoria Park and horse racing.', amenities:['heated-pool','spa','gym','restaurant'], images:[{url:'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=80'}] },
  ],
  // Galle (d7)
  d7: [
    { _id:'hg1', name:'Amangalla Fort Hotel', category:'boutique', starRating:5, priceRange:{min:600,max:1200,currency:'USD'}, address:{city:'Galle Fort',country:'Sri Lanka'}, description:'Iconic heritage hotel inside the Galle Fort walls. Steps from the lighthouse, Dutch Reformed Church, Historical Mansion and Maritime Museum.', amenities:['spa','pool','restaurant','wifi','concierge'], images:[{url:'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=600&q=80'}] },
    { _id:'hg2', name:'The Fort Printers', category:'boutique', starRating:4, priceRange:{min:200,max:380,currency:'USD'}, address:{city:'Galle Fort',country:'Sri Lanka'}, description:'Restored 18th-century printing house within the Fort. Steps from the lighthouse, Historical Mansion and Unawatuna Jungle Beach.', amenities:['pool','restaurant','wifi','bar'], images:[{url:'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=600&q=80'}] },
    { _id:'hg3', name:'Closenberg Hotel Galle', category:'hotel', starRating:3, priceRange:{min:70,max:130,currency:'USD'}, address:{city:'Galle',country:'Sri Lanka'}, description:'Colonial villa on the harbour. Easy access to Galle Fort, the lighthouse viewpoint and Unawatuna snorkelling bay.', amenities:['pool','restaurant','wifi','parking'], images:[{url:'https://images.unsplash.com/photo-1496417263034-38ec4f0b665a?w=600&q=80'}] },
    { _id:'hg4', name:'Jetwing Lighthouse', category:'resort', starRating:5, priceRange:{min:220,max:450,currency:'USD'}, address:{city:'Galle',country:'Sri Lanka'}, description:'Designed by Geoffrey Bawa, sitting on the rocky shore. Famous for its main staircase sculpture and sunset views.', amenities:['pool','spa','tennis','restaurant'], images:[{url:'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=600&q=80'}] },
    { _id:'hg5', name:'Le Grand Galle', category:'hotel', starRating:5, priceRange:{min:190,max:380,currency:'USD'}, address:{city:'Galle',country:'Sri Lanka'}, description:'Luxury hotel offering spectacular views of the Galle Fort from the outside, with modern amenities and plunge pools.', amenities:['pool','gym','bar','restaurant'], images:[{url:'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=600&q=80'}] },
  ],
  // Matara (d8)
  d8: [
    { _id:'hma1', name:'Mirissa Hills Villa', category:'villa', starRating:5, priceRange:{min:250,max:500,currency:'USD'}, address:{city:'Mirissa',country:'Sri Lanka'}, description:'Six exclusive villas with ocean views. Close to Mirissa whale-watching jetty, Paravi Duwa Temple and Polhena Reef.', amenities:['pool','spa','wifi','restaurant','concierge'], images:[{url:'https://images.unsplash.com/photo-1573052905904-34ad8c27f0cc?w=600&q=80'}] },
    { _id:'hma2', name:'Star Fort Residence Matara', category:'boutique', starRating:4, priceRange:{min:110,max:220,currency:'USD'}, address:{city:'Matara',country:'Sri Lanka'}, description:'Boutique hotel in Matara town, minutes from the Star Fort, Polhena Reef turtle snorkelling and Dondra Head Lighthouse.', amenities:['pool','restaurant','wifi','airport-shuttle'], images:[{url:'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=80'}] },
    { _id:'hma3', name:'Polhena Reef Rooms Matara', category:'guesthouse', starRating:3, priceRange:{min:45,max:90,currency:'USD'}, address:{city:'Matara',country:'Sri Lanka'}, description:'Beachside guesthouse steps from the turtle-friendly Polhena Reef and Wella Dewalaya. Easy ride to Dondra Lighthouse.', amenities:['wifi','restaurant','parking'], images:[{url:'https://images.unsplash.com/photo-1455587734955-081b22074882?w=600&q=80'}] },
    { _id:'hma4', name:'Parrotfish Bay', category:'resort', starRating:4, priceRange:{min:150,max:300,currency:'USD'}, address:{city:'Mirissa',country:'Sri Lanka'}, description:'Secluded luxury beach stay near Mirissa, offering private access to the ocean and whale watching tours.', amenities:['pool','restaurant','bar','beach-access'], images:[{url:'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=600&q=80'}] },
    { _id:'hma5', name:'Mandara Resort', category:'resort', starRating:4, priceRange:{min:100,max:200,currency:'USD'}, address:{city:'Mirissa',country:'Sri Lanka'}, description:'Located between the river and the sea, offering dolphin watching excursions and ayurvedic spa treatments.', amenities:['pool','spa','restaurant','gym'], images:[{url:'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=600&q=80'}] },
  ],
  // Hambantota (d9)
  d9: [
    { _id:'hh1', name:'Cape Weligama Resort', category:'resort', starRating:5, priceRange:{min:300,max:600,currency:'USD'}, address:{city:'Weligama',country:'Sri Lanka'}, description:'Clifftop villa resort with infinity pool. Ideal base for Yala leopard safaris, Bundala birding, Kataragama and Rekawa turtle nights.', amenities:['pool','spa','restaurant','wifi','gym','concierge'], images:[{url:'https://images.unsplash.com/photo-1561501900-3701fa6a0864?w=600&q=80'}] },
    { _id:'hh2', name:'Tissamaharama Safari Camp', category:'boutique', starRating:4, priceRange:{min:120,max:250,currency:'USD'}, address:{city:'Tissamaharama',country:'Sri Lanka'}, description:'Safari lodge at the gateway to Yala and Bundala. Overlooks Tissa Wewa tank beside the great Tissamaharama Stupa.', amenities:['restaurant','wifi','airport-shuttle','parking'], images:[{url:'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=600&q=80'}] },
    { _id:'hh3', name:'Refresh Tissa Hotel', category:'hotel', starRating:3, priceRange:{min:40,max:80,currency:'USD'}, address:{city:'Tissamaharama',country:'Sri Lanka'}, description:'Budget hotel near Yala gate, Rekawa turtle beach, Kataragama Dewalaya and Mulkirigala Rock Temple.', amenities:['wifi','restaurant','parking'], images:[{url:'https://images.unsplash.com/photo-1563911302283-d2bc129e7570?w=600&q=80'}] },
    { _id:'hh4', name:'Shangri-La Hambantota', category:'resort', starRating:5, priceRange:{min:220,max:450,currency:'USD'}, address:{city:'Hambantota',country:'Sri Lanka'}, description:'Sprawling golf resort and spa on the southern coast, featuring botanical gardens and an artisan village.', amenities:['golf','pool','spa','kids-club','restaurant'], images:[{url:'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=600&q=80'}] },
    { _id:'hh5', name:'Cinnamon Wild Yala', category:'resort', starRating:4, priceRange:{min:180,max:360,currency:'USD'}, address:{city:'Yala',country:'Sri Lanka'}, description:'Rustic chalets bordering the national park. Wild boar and elephants often roam the hotel grounds.', amenities:['pool','safari','restaurant','bar'], images:[{url:'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=600&q=80'}] },
  ],
  // Jaffna (d10)
  d10: [
    { _id:'hj1', name:'Jetwing Jaffna', category:'hotel', starRating:5, priceRange:{min:130,max:260,currency:'USD'}, address:{city:'Jaffna',country:'Sri Lanka'}, description:'The premier hotel in Jaffna, rooftop pool overlooking the lagoon. Steps from Nallur Kovil and close to Jaffna Fort, Nainativu and Casuarina Beach.', amenities:['pool','restaurant','wifi','bar','spa'], images:[{url:'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=600&q=80'}] },
    { _id:'hj2', name:'The Thinnai Heritage Hotel', category:'boutique', starRating:4, priceRange:{min:80,max:160,currency:'USD'}, address:{city:'Jaffna',country:'Sri Lanka'}, description:'Heritage boutique blending Tamil architecture with modern comfort. Close to Jaffna Public Library, Keerimalai hot springs and Nainativu ferry.', amenities:['restaurant','wifi','concierge','parking'], images:[{url:'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=600&q=80'}] },
    { _id:'hj3', name:'Rio Beach Resort Jaffna', category:'hotel', starRating:3, priceRange:{min:45,max:85,currency:'USD'}, address:{city:'Jaffna',country:'Sri Lanka'}, description:'Simple beachside hotel near Casuarina Beach and Keerimalai hot springs — a peaceful northern escape.', amenities:['wifi','restaurant','parking'], images:[{url:'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?w=600&q=80'}] },
    { _id:'hj4', name:'Fox Resorts Jaffna', category:'boutique', starRating:4, priceRange:{min:100,max:200,currency:'USD'}, address:{city:'Jaffna',country:'Sri Lanka'}, description:'A historic home turned boutique resort, featuring underground bunkers from the war era and lush gardens.', amenities:['pool','restaurant','history-tour','wifi'], images:[{url:'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=600&q=80'}] },
    { _id:'hj5', name:'North Gate by Jetwing', category:'hotel', starRating:4, priceRange:{min:90,max:180,currency:'USD'}, address:{city:'Jaffna',country:'Sri Lanka'}, description:'Located next to the Jaffna Railway Station, combining modern design with northern hospitality.', amenities:['pool','gym','restaurant','wifi'], images:[{url:'https://images.unsplash.com/photo-1561501878-aabd62634533?w=600&q=80'}] },
  ],
  // Kilinochchi (d11)
  d11: [
    { _id:'hki1', name:'Iranamadu Eco Lodge', category:'boutique', starRating:3, priceRange:{min:50,max:100,currency:'USD'}, address:{city:'Kilinochchi',country:'Sri Lanka'}, description:'Peaceful eco-lodge near Iranamadu Tank, ideal for birdwatching, Pooneryn Fort and the Aadampan Bird Sanctuary.', amenities:['wifi','restaurant','parking'], images:[{url:'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=80'}] },
    { _id:'hki2', name:'Northern Stay Kilinochchi', category:'guesthouse', starRating:2, priceRange:{min:25,max:50,currency:'USD'}, address:{city:'Kilinochchi',country:'Sri Lanka'}, description:'Clean guesthouse a short drive from the War Memorial Water Tower and Pooneryn Fort.', amenities:['wifi','parking'], images:[{url:'https://images.unsplash.com/photo-1496417263034-38ec4f0b665a?w=600&q=80'}] },
    { _id:'hki3', name:'Mulankavil Sanctuary Stay', category:'hotel', starRating:3, priceRange:{min:40,max:80,currency:'USD'}, address:{city:'Kilinochchi',country:'Sri Lanka'}, description:'Comfortable hotel for visiting the Aadampan Bird Sanctuary and Kilinochchi Town Market.', amenities:['wifi','restaurant','parking'], images:[{url:'https://images.unsplash.com/photo-1563911302283-d2bc129e7570?w=600&q=80'}] },
  ],
  // Mannar (d12)
  d12: [
    { _id:'hmn1', name:'Mannar Beach Hotel', category:'hotel', starRating:3, priceRange:{min:50,max:100,currency:'USD'}, address:{city:'Mannar',country:'Sri Lanka'}, description:"Walking distance to Mannar Fort. Day trips to Adam's Bridge, Giant's Tank and the famous 700-year-old Baobab tree.", amenities:['wifi','restaurant','parking'], images:[{url:'https://images.unsplash.com/photo-1561501878-aabd62634533?w=600&q=80'}] },
    { _id:'hmn2', name:"Giant's Tank Bungalow", category:'boutique', starRating:3, priceRange:{min:60,max:120,currency:'USD'}, address:{city:'Mannar',country:'Sri Lanka'}, description:"Quiet bungalow near Giant's Tank bird sanctuary. Ideal for flamingo spotters and Talaimannar Pier sunset visits.", amenities:['wifi','restaurant','parking'], images:[{url:'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=600&q=80'}] },
    { _id:'hmn3', name:'Baobab Guest House Mannar', category:'guesthouse', starRating:2, priceRange:{min:25,max:50,currency:'USD'}, address:{city:'Mannar',country:'Sri Lanka'}, description:"Budget stay near Mannar's ancient Baobab tree and the Dutch Fort. Simple and welcoming.", amenities:['wifi','parking'], images:[{url:'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?w=600&q=80'}] },
    { _id:'hmn4', name:'Shell Coast Resort', category:'hotel', starRating:3, priceRange:{min:40,max:80,currency:'USD'}, address:{city:'Mannar',country:'Sri Lanka'}, description:'Located on the causeway, offering sea views and easy access to the Thiruketheeswaram Kovil.', amenities:['restaurant','parking','wifi'], images:[{url:'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=600&q=80'}] },
  ],
  // Vavuniya (d13)
  d13: [
    { _id:'hva1', name:'Vavuniya Grand Hotel', category:'hotel', starRating:3, priceRange:{min:45,max:90,currency:'USD'}, address:{city:'Vavuniya',country:'Sri Lanka'}, description:'Main hotel in Vavuniya, well placed for Madhu Church, Kandasamy Kovil and Cheddikulam Bird Sanctuary.', amenities:['wifi','restaurant','parking','24-hour-front-desk'], images:[{url:'https://images.unsplash.com/photo-1455587734955-081b22074882?w=600&q=80'}] },
    { _id:'hva2', name:'Northern Transit Resort', category:'hotel', starRating:3, priceRange:{min:40,max:80,currency:'USD'}, address:{city:'Vavuniya',country:'Sri Lanka'}, description:'Clean hotel on the A9 highway. Ideal midpoint between Colombo and Jaffna and handy for Vavuniya Museum visits.', amenities:['wifi','restaurant','parking'], images:[{url:'https://images.unsplash.com/photo-1563911302283-d2bc129e7570?w=600&q=80'}] },
    { _id:'hva3', name:'Madhu Pilgrim Inn', category:'guesthouse', starRating:2, priceRange:{min:20,max:45,currency:'USD'}, address:{city:'Vavuniya',country:'Sri Lanka'}, description:'Simple pilgrim-friendly guesthouse, a common stop for visitors arriving at the sacred Madhu Church shrine.', amenities:['wifi','parking'], images:[{url:'https://images.unsplash.com/photo-1496417263034-38ec4f0b665a?w=600&q=80'}] },
  ],
  // Mullaitivu (d14)
  d14: [
    { _id:'hmu1', name:'Nandikadal Eco Stay', category:'boutique', starRating:3, priceRange:{min:50,max:100,currency:'USD'}, address:{city:'Mullaitivu',country:'Sri Lanka'}, description:'Eco-stay beside Nandikadal Lagoon with mangrove kayaking. Close to Mullaitivu Beach and Chalai Beach.', amenities:['wifi','restaurant','parking'], images:[{url:'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=80'}] },
    { _id:'hmu2', name:'Chalai Casuarina Resort', category:'hotel', starRating:3, priceRange:{min:45,max:90,currency:'USD'}, address:{city:'Mullaitivu',country:'Sri Lanka'}, description:'Peaceful resort near Chalai and Mullaitivu beaches. Mangrove canoe tours arranged for guests.', amenities:['wifi','restaurant','parking'], images:[{url:'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=600&q=80'}] },
    { _id:'hmu3', name:'Mullai Beach Guest House', category:'guesthouse', starRating:2, priceRange:{min:25,max:55,currency:'USD'}, address:{city:'Mullaitivu',country:'Sri Lanka'}, description:"Simple beachside accommodation on Mullaitivu's pristine coast near the Putumattalan Memorial.", amenities:['wifi','parking'], images:[{url:'https://images.unsplash.com/photo-1561501878-aabd62634533?w=600&q=80'}] },
  ],
  // Trincomalee (d15)
  d15: [
    { _id:'ht1', name:'Jungle Beach Resort Trinco', category:'resort', starRating:5, priceRange:{min:280,max:560,currency:'USD'}, address:{city:'Trincomalee',country:'Sri Lanka'}, description:'Secluded luxury near Nilaveli. Perfect for Pigeon Island snorkelling, whale watching, Koneswaram Temple and Kanniya hot springs.', amenities:['pool','spa','restaurant','wifi','concierge','gym'], images:[{url:'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=600&q=80'}] },
    { _id:'ht2', name:'Nilaveli Beach Hotel', category:'hotel', starRating:4, priceRange:{min:110,max:220,currency:'USD'}, address:{city:'Nilaveli',country:'Sri Lanka'}, description:'Right on the famous 15 km Nilaveli Beach. Walk to Pigeon Island coral reef; short drive to Fort Frederick and Koneswaram.', amenities:['pool','restaurant','wifi','bar'], images:[{url:'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=600&q=80'}] },
    { _id:'ht3', name:'Fort Frederick Heritage Stay', category:'boutique', starRating:3, priceRange:{min:55,max:110,currency:'USD'}, address:{city:'Trincomalee',country:'Sri Lanka'}, description:'Heritage hotel steps from Fort Frederick and Koneswaram. Whale watching and Kanniya hot-spring tours arranged.', amenities:['wifi','restaurant','parking'], images:[{url:'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=600&q=80'}] },
    { _id:'ht4', name:'Trinco Blu by Cinnamon', category:'resort', starRating:4, priceRange:{min:120,max:240,currency:'USD'}, address:{city:'Trincomalee',country:'Sri Lanka'}, description:'Retro-chic resort famous for its sunrise views and whale watching excursions.', amenities:['pool','diving-center','restaurant','bar'], images:[{url:'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=80'}] },
    { _id:'ht5', name:'Amaranthe Bay Resort', category:'boutique', starRating:4, priceRange:{min:90,max:180,currency:'USD'}, address:{city:'Uppuveli',country:'Sri Lanka'}, description:'Nestled between the lagoon and the sea, offering kayak adventures and spa treatments.', amenities:['pool','spa','bar','restaurant'], images:[{url:'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=600&q=80'}] },
  ],
  // Batticaloa (d16)
  d16: [
    { _id:'hb1', name:'Pasikudah Bay Resort', category:'resort', starRating:5, priceRange:{min:220,max:440,currency:'USD'}, address:{city:'Pasikudah',country:'Sri Lanka'}, description:'Beachfront luxury on world-famous Pasikudah Bay. Day trips to Batticaloa Fort, Kallady Bridge and the Singing Fish Lagoon.', amenities:['pool','spa','restaurant','wifi','gym','bar'], images:[{url:'https://images.unsplash.com/photo-1561501900-3701fa6a0864?w=600&q=80'}] },
    { _id:'hb2', name:'Amaya Beach Pasikudah', category:'hotel', starRating:4, priceRange:{min:100,max:200,currency:'USD'}, address:{city:'Pasikudah',country:'Sri Lanka'}, description:'4-star beach hotel on Pasikudah bay. Easy access to Kalkudah Beach and Batticaloa Lagoon boat rides.', amenities:['pool','restaurant','wifi','bar','gym'], images:[{url:'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=600&q=80'}] },
    { _id:'hb3', name:'Batti Lagoon Guest House', category:'guesthouse', starRating:3, priceRange:{min:40,max:80,currency:'USD'}, address:{city:'Batticaloa',country:'Sri Lanka'}, description:'Lagoon-side guesthouse in Batticaloa near the Fort, Kallady Bridge and the famous singing fish phenomenon.', amenities:['wifi','restaurant','parking'], images:[{url:'https://images.unsplash.com/photo-1496417263034-38ec4f0b665a?w=600&q=80'}] },
    { _id:'hb4', name:'Maalu Maalu Resort & Spa', category:'resort', starRating:5, priceRange:{min:200,max:400,currency:'USD'}, address:{city:'Pasikudah',country:'Sri Lanka'}, description:'Designed like a traditional fishing village, this eco-friendly resort offers direct beach access.', amenities:['pool','spa','restaurant','beach-bar'], images:[{url:'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=600&q=80'}] },
  ],
  // Ampara (d17)
  d17: [
    { _id:'ha1', name:'Sooriya Resort Arugam Bay', category:'boutique', starRating:4, priceRange:{min:120,max:240,currency:'USD'}, address:{city:'Arugam Bay',country:'Sri Lanka'}, description:'Stylish boutique at Arugam Bay surf point. Surf lessons, yoga and day trips to Kumana NP, Lahugala elephants and Crocodile Rock.', amenities:['pool','restaurant','wifi','bar','concierge'], images:[{url:'https://images.unsplash.com/photo-1573052905904-34ad8c27f0cc?w=600&q=80'}] },
    { _id:'ha2', name:'Stardust Beach Hotel', category:'hotel', starRating:3, priceRange:{min:60,max:120,currency:'USD'}, address:{city:'Arugam Bay',country:'Sri Lanka'}, description:'Well-loved beachside hotel for surfers. Short ride to Kumana National Park, Deegavapi Stupa and Lahugala elephants.', amenities:['restaurant','wifi','parking'], images:[{url:'https://images.unsplash.com/photo-1455587734955-081b22074882?w=600&q=80'}] },
    { _id:'ha3', name:'Hideaway Arugam Bay', category:'guesthouse', starRating:2, priceRange:{min:25,max:55,currency:'USD'}, address:{city:'Arugam Bay',country:'Sri Lanka'}, description:'Casual surf shack accommodation steps from the famous point break. Budget option for independent travellers.', amenities:['wifi','parking'], images:[{url:'https://images.unsplash.com/photo-1563911302283-d2bc129e7570?w=600&q=80'}] },
    { _id:'ha4', name:'Jetwing Surf', category:'resort', starRating:5, priceRange:{min:220,max:450,currency:'USD'}, address:{city:'Pottuvil',country:'Sri Lanka'}, description:'Eco-luxury cabanas designed to minimize environmental impact, close to the surfing waves.', amenities:['pool','restaurant','bar','beach-volleyball'], images:[{url:'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=80'}] },
  ],
  // Kurunegala (d18)
  d18: [
    { _id:'hku1', name:'Ethagala Hotel Kurunegala', category:'hotel', starRating:4, priceRange:{min:85,max:170,currency:'USD'}, address:{city:'Kurunegala',country:'Sri Lanka'}, description:'Modern hotel at the foot of Elephant Rock. walking distance to Kurunegala Lake and rides to Aukana Buddha and Ridi Vihara.', amenities:['pool','restaurant','wifi','gym'], images:[{url:'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=600&q=80'}] },
    { _id:'hku2', name:'Padeniya Heritage Inn', category:'boutique', starRating:3, priceRange:{min:55,max:110,currency:'USD'}, address:{city:'Kurunegala',country:'Sri Lanka'}, description:'Boutique inn near Padeniya Raja Maha Vihara and Kurunegala Lake. Easy access to Aukana Buddha.', amenities:['restaurant','wifi','parking'], images:[{url:'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=600&q=80'}] },
    { _id:'hku3', name:'Kurunegala Rest House', category:'hotel', starRating:3, priceRange:{min:35,max:70,currency:'USD'}, address:{city:'Kurunegala',country:'Sri Lanka'}, description:'Classic rest house on the rock overlooking Kurunegala Lake. Near Ethagala viewpoint and Aukana.', amenities:['wifi','restaurant','parking'], images:[{url:'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=600&q=80'}] },
  ],
  // Puttalam (d19)
  d19: [
    { _id:'hpu1', name:'Mahoora Safari Camp Wilpattu', category:'resort', starRating:4, priceRange:{min:200,max:400,currency:'USD'}, address:{city:'Wilpattu',country:'Sri Lanka'}, description:'Exclusive tented camp at the edge of Wilpattu NP — closest luxury stay for leopard and sloth bear safaris.', amenities:['restaurant','wifi','concierge'], images:[{url:'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=600&q=80'}] },
    { _id:'hpu2', name:'Kalpitiya Beach Resort', category:'hotel', starRating:3, priceRange:{min:70,max:140,currency:'USD'}, address:{city:'Kalpitiya',country:'Sri Lanka'}, description:'Beachfront hotel on the Kalpitiya Peninsula for kitesurfing and dolphin watching. Near the Dutch Fort Kalpitiya.', amenities:['pool','restaurant','wifi','bar'], images:[{url:'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=600&q=80'}] },
    { _id:'hpu3', name:'Puttalam Lagoon Guesthouse', category:'guesthouse', starRating:2, priceRange:{min:25,max:55,currency:'USD'}, address:{city:'Puttalam',country:'Sri Lanka'}, description:'Affordable lagoon-side stay with views of the pink salt pans and flamingo-filled Puttalam Lagoon.', amenities:['wifi','parking'], images:[{url:'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=80'}] },
    { _id:'hpu4', name:'Dolphin Beach Resort', category:'resort', starRating:4, priceRange:{min:150,max:300,currency:'USD'}, address:{city:'Kalpitiya',country:'Sri Lanka'}, description:'Tented luxury resort on the beach, famous for kite surfing and dolphin watching.', amenities:['pool','water-sports','restaurant','bar'], images:[{url:'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=600&q=80'}] },
  ],
  // Anuradhapura (d20)
  d20: [
    { _id:'han1', name:'Ulagalla Resort Anuradhapura', category:'resort', starRating:5, priceRange:{min:260,max:520,currency:'USD'}, address:{city:'Anuradhapura',country:'Sri Lanka'}, description:'Luxury retreat in 58 acres minutes from Sri Maha Bodhi, Ruwanwelisaya, Abhayagiri Monastery and Mihintale.', amenities:['pool','spa','restaurant','wifi','concierge'], images:[{url:'https://images.unsplash.com/photo-1561501900-3701fa6a0864?w=600&q=80'}] },
    { _id:'han2', name:'Tissawewa Grand Hotel', category:'hotel', starRating:4, priceRange:{min:100,max:200,currency:'USD'}, address:{city:'Anuradhapura',country:'Sri Lanka'}, description:'Historic hotel overlooking Tissawewa Tank. Walking distance to Isurumuniya Vihara, Thuparama Stupa and the sacred city.', amenities:['pool','restaurant','wifi','bar'], images:[{url:'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=600&q=80'}] },
    { _id:'han3', name:'Milano Tourist Rest', category:'guesthouse', starRating:3, priceRange:{min:30,max:60,currency:'USD'}, address:{city:'Anuradhapura',country:'Sri Lanka'}, description:'Budget guesthouse close to Sri Maha Bodhi. Ideal for pilgrims visiting the Cultural Triangle and Mihintale.', amenities:['wifi','restaurant','parking'], images:[{url:'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?w=600&q=80'}] },
    { _id:'han4', name:'The Sanctuary at Tissawewa', category:'boutique', starRating:4, priceRange:{min:120,max:240,currency:'USD'}, address:{city:'Anuradhapura',country:'Sri Lanka'}, description:'Colonial bungalow set in a parkland, offering a tranquil stay amidst the ancient ruins.', amenities:['restaurant','garden','wifi','parking'], images:[{url:'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=600&q=80'}] },
  ],
  // Polonnaruwa (d21)
  d21: [
    { _id:'hpo1', name:'Deer Park Hotel Polonnaruwa', category:'hotel', starRating:4, priceRange:{min:110,max:220,currency:'USD'}, address:{city:'Polonnaruwa',country:'Sri Lanka'}, description:'Elegant lakeside hotel on Parakrama Samudra. Close to Gal Vihara, Royal Palace, Vatadage and Minneriya elephant gathering.', amenities:['pool','restaurant','wifi','gym'], images:[{url:'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=600&q=80'}] },
    { _id:'hpo2', name:'Polonnaruwa Rest House', category:'boutique', starRating:3, priceRange:{min:65,max:130,currency:'USD'}, address:{city:'Polonnaruwa',country:'Sri Lanka'}, description:'Garden resort near the ancient city entrance. Steps from Vatadage, Lankathilaka Image House and the museum.', amenities:['pool','restaurant','wifi','parking'], images:[{url:'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=600&q=80'}] },
    { _id:'hpo3', name:'Giritale Hotel', category:'hotel', starRating:4, priceRange:{min:90,max:180,currency:'USD'}, address:{city:'Giritale',country:'Sri Lanka'}, description:'Hilltop hotel between Polonnaruwa and Minneriya — the best base for early-morning elephant gathering safaris.', amenities:['pool','restaurant','wifi','bar'], images:[{url:'https://images.unsplash.com/photo-1561501878-aabd62634533?w=600&q=80'}] },
    { _id:'hpo4', name:'Hotel Sudu Araliya', category:'hotel', starRating:4, priceRange:{min:80,max:160,currency:'USD'}, address:{city:'Polonnaruwa',country:'Sri Lanka'}, description:'Lakeside hotel located close to the ancient technology museum and the ruins.', amenities:['pool','spa','restaurant','gym'], images:[{url:'https://images.unsplash.com/photo-1563911302283-d2bc129e7570?w=600&q=80'}] },
  ],
  // Badulla/Ella (d22)
  d22: [
    { _id:'he1', name:'98 Acres Resort & Spa', category:'resort', starRating:5, priceRange:{min:200,max:450,currency:'USD'}, address:{city:'Ella',country:'Sri Lanka'}, description:"Stunning hilltop resort across 98 tea-estate acres. Walk to Nine Arch Bridge, Ella Rock, Rawana Falls and Little Adam's Peak.", amenities:['pool','spa','restaurant','wifi','gym'], images:[{url:'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=600&q=80'}] },
    { _id:'he2', name:'Zion View Ella', category:'boutique', starRating:4, priceRange:{min:100,max:200,currency:'USD'}, address:{city:'Ella',country:'Sri Lanka'}, description:'Sweeping valley views and jacuzzi. Steps from the Demodara Loop viewpoint, Ella Rock trail and Dunhinda Falls hike.', amenities:['pool','restaurant','wifi','airport-shuttle'], images:[{url:'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=600&q=80'}] },
    { _id:'he3', name:'Ella Flower Garden Resort', category:'hotel', starRating:3, priceRange:{min:55,max:100,currency:'USD'}, address:{city:'Ella',country:'Sri Lanka'}, description:'Cosy mountain hotel surrounded by tea bushes. Great base for Rawana Falls, Dunhinda Falls and the Demodara Loop.', amenities:['wifi','restaurant','parking'], images:[{url:'https://images.unsplash.com/photo-1563911302283-d2bc129e7570?w=600&q=80'}] },
    { _id:'he4', name:'EKHO Ella', category:'hotel', starRating:4, priceRange:{min:120,max:220,currency:'USD'}, address:{city:'Ella',country:'Sri Lanka'}, description:'Nature-inspired hotel designed to blend with the misty hills, close to the town center and railway station.', amenities:['restaurant','bar','garden','wifi'], images:[{url:'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=600&q=80'}] },
    { _id:'he5', name:'Chill Ville, View Point Hotel', category:'boutique', starRating:4, priceRange:{min:90,max:180,currency:'USD'}, address:{city:'Ella',country:'Sri Lanka'}, description:'Offers breathtaking views of the Ella Gap and Little Adam’s Peak with a beautiful infinity pool.', amenities:['pool','restaurant','bar','wifi'], images:[{url:'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=600&q=80'}] },
  ],
  // Monaragala (d23)
  d23: [
    { _id:'hmo1', name:'Gal Oya Lodge', category:'boutique', starRating:4, priceRange:{min:180,max:360,currency:'USD'}, address:{city:'Inginiyagala',country:'Sri Lanka'}, description:'The only lodge inside Gal Oya NP — the famous elephant boat safari departs from the jetty here.', amenities:['restaurant','wifi','concierge'], images:[{url:'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=600&q=80'}] },
    { _id:'hmo2', name:'Buduruwagala Guest House', category:'guesthouse', starRating:3, priceRange:{min:35,max:70,currency:'USD'}, address:{city:'Wellawaya',country:'Sri Lanka'}, description:'Simple guesthouse near the Buduruwagala rock temple and Maligawila Buddha. Day trips to Gal Oya and Yala.', amenities:['wifi','restaurant','parking'], images:[{url:'https://images.unsplash.com/photo-1496417263034-38ec4f0b665a?w=600&q=80'}] },
    { _id:'hmo3', name:'Wellawaya Valley Inn', category:'hotel', starRating:3, priceRange:{min:40,max:80,currency:'USD'}, address:{city:'Wellawaya',country:'Sri Lanka'}, description:'Convenient hotel at the scenic Wellawaya junction. Day trips to Gal Oya boat safari and Inginiyagala Dam.', amenities:['wifi','restaurant','parking'], images:[{url:'https://images.unsplash.com/photo-1563911302283-d2bc129e7570?w=600&q=80'}] },
  ],
  // Ratnapura (d24)
  d24: [
    { _id:'hr1', name:"Adam's Peak Eco Lodge", category:'boutique', starRating:4, priceRange:{min:100,max:200,currency:'USD'}, address:{city:'Dalhousie',country:'Sri Lanka'}, description:"Alpine lodge at the base of Adam's Peak Sri Pada trail. Sinharaja birding day tours and Bopath Falls trips arranged.", amenities:['restaurant','wifi','parking'], images:[{url:'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=600&q=80'}] },
    { _id:'hr2', name:'Sinharaja Rain Forest Resort', category:'resort', starRating:4, priceRange:{min:130,max:260,currency:'USD'}, address:{city:'Deniyaya',country:'Sri Lanka'}, description:'Forest-edge resort for guided Sinharaja birding walks, waterfall hikes and visits to Bopath Falls and Maha Saman Devalaya.', amenities:['pool','restaurant','wifi','concierge'], images:[{url:'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=80'}] },
    { _id:'hr3', name:'Gem City Hotel Ratnapura', category:'hotel', starRating:3, priceRange:{min:45,max:90,currency:'USD'}, address:{city:'Ratnapura',country:'Sri Lanka'}, description:'Well-connected hotel in Ratnapura near the Gem Museum, Maha Saman Devalaya and Bopath Falls.', amenities:['wifi','restaurant','parking'], images:[{url:'https://images.unsplash.com/photo-1561501878-aabd62634533?w=600&q=80'}] },
    { _id:'hr4', name:'Bopath Falls View Hotel', category:'hotel', starRating:3, priceRange:{min:50,max:100,currency:'USD'}, address:{city:'Kuruwita',country:'Sri Lanka'}, description:'Situated right next to the Bopath Falls, offering soothing sounds of water and lush green surroundings.', amenities:['restaurant','parking','garden'], images:[{url:'https://images.unsplash.com/photo-1563911302283-d2bc129e7570?w=600&q=80'}] },
  ],
  // Kegalle (d25)
  d25: [
    { _id:'hke1', name:'Borderlands Adventure Lodge', category:'boutique', starRating:4, priceRange:{min:140,max:280,currency:'USD'}, address:{city:'Kitulgala',country:'Sri Lanka'}, description:"Sri Lanka's premier adventure lodge on the Kelani River. White-water rafting, canyoning and Belilena Cave trips from the doorstep.", amenities:['restaurant','wifi','concierge','parking'], images:[{url:'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=600&q=80'}] },
    { _id:'hke2', name:'Kitulgala Rest House', category:'hotel', starRating:3, priceRange:{min:55,max:110,currency:'USD'}, address:{city:'Kitulgala',country:'Sri Lanka'}, description:"Heritage rest house on the River Kwai filming site riverbank. Near Belilena Cave, Ambuluwawa Tower and Rambukkana incline.", amenities:['restaurant','wifi','parking','bar'], images:[{url:'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=600&q=80'}] },
    { _id:'hke3', name:'Ambuluwawa Bungalow Stay', category:'boutique', starRating:3, priceRange:{min:60,max:120,currency:'USD'}, address:{city:'Kegalle',country:'Sri Lanka'}, description:'Cosy bungalow near Ambuluwawa Tower and Rambukkana railway incline. Easy access to Belilena Cave.', amenities:['wifi','restaurant','parking'], images:[{url:'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=600&q=80'}] },
    { _id:'hke4', name:'Palm Garden Guest House', category:'guesthouse', starRating:2, priceRange:{min:30,max:60,currency:'USD'}, address:{city:'Kegalle',country:'Sri Lanka'}, description:'Budget friendly place near the Pinnawala Elephant Orphanage and spice gardens.', amenities:['wifi','parking','breakfast'], images:[{url:'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?w=600&q=80'}] },
  ],
}

function getDistrictHotels(district) {
  if (district?.id && HOTELS_BY_DISTRICT[district.id]) {
    return HOTELS_BY_DISTRICT[district.id]
  }
  // fall back to city name match in legacy FALLBACK_HOTELS
  const key = (district?.name || district?.city || '').toLowerCase().trim()
  for (const [k, hotels] of Object.entries(FALLBACK_HOTELS)) {
    if (k !== 'default' && key.includes(k)) return hotels
  }
  return FALLBACK_HOTELS.default
}

/* ─── Amenity label map ─── */
const AMENITY_LABELS = {
  wifi: '📶 WiFi', pool: '🏊 Pool', spa: '💆 Spa', gym: '🏋️ Gym',
  restaurant: '🍽️ Restaurant', bar: '🍸 Bar', parking: '🅿️ Parking',
  'room-service': '🛎️ Room Service', laundry: '👔 Laundry',
  'airport-shuttle': '🚌 Airport Shuttle', concierge: '🤵 Concierge',
  'pet-friendly': '🐾 Pet Friendly', 'air-conditioning': '❄️ A/C',
  'non-smoking-rooms': '🚭 Non-Smoking', '24-hour-front-desk': '🕐 24h Desk',
  'wheelchair-accessible': '♿ Accessible'
}

/* ─── Place type icon map ─── */
const TYPE_ICONS = {
  Temple: '🛕', Park: '🌲', Museum: '🏛️', Market: '🏪',
  Heritage: '🏯', Beach: '🏖️', Nature: '🌿', Lake: '🏞️',
  Garden: '🌺', Viewpoint: '🔭', Safari: '🐘', Culture: '🎭',
  Wildlife: '🦁', Shopping: '🛍️', Waterfall: '💧',
}

/* ─── Currency display ─── */
const DISPLAY_CURRENCIES = [
  { code: 'LKR', symbol: 'Rs', label: 'LKR',  rate: 300  },
  { code: 'USD', symbol: '$',  label: 'USD',  rate: 1    },
  { code: 'EUR', symbol: '€',  label: 'EUR',  rate: 0.92 },
]

function convertPrice(amount, toCurrency) {
  if (amount === null || amount === undefined) return null
  // All stored prices are in USD
  const to = DISPLAY_CURRENCIES.find(c => c.code === toCurrency)?.rate ?? 1
  return Math.round(amount * to)
}

function currencySymbol(code) {
  return DISPLAY_CURRENCIES.find(c => c.code === code)?.symbol ?? code
}

/* ─── Star display ─── */
function Stars({ count }) {
  return (
    <div className="hp-stars">
      {[1, 2, 3, 4, 5].map(i => (
        <svg key={i} viewBox="0 0 24 24" className={`hp-star${i <= count ? ' filled' : ''}`}>
          <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
        </svg>
      ))}
      <span className="hp-star-label">{count}-Star</span>
    </div>
  )
}

/* ─── Hotel Card ─── */
function HotelCard({ hotel, onSelect, onDeselect, isSelected, selectedNights, displayCurrency = 'USD', nightsFull = false }) {
  const [showReviews, setShowReviews] = useState(false)
  const img = hotel.images?.[0]?.url || hotel.images?.[0] ||
    'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=600&q=80'
  const city = hotel.address?.city || hotel.location?.city || ''
  const rawMin = hotel.priceRange?.min ?? hotel.pricePerNight ?? null
  const rawMax = hotel.priceRange?.max ?? null
  const sym = currencySymbol(displayCurrency)
  const priceMin = rawMin !== null ? convertPrice(rawMin, displayCurrency) : '—'
  const priceMax = rawMax !== null ? convertPrice(rawMax, displayCurrency) : null
  const dbId = hotel.place_id ?? hotel.place?.place_id ?? null

  return (
    <div className={`hp-card-wrap${showReviews ? ' hp-card-wrap--open' : ''}${isSelected ? ' hp-card-wrap--selected' : ''}`}>
      <div
        className="hp-card"
        onClick={() => !isSelected && !nightsFull && onSelect(hotel)}
        style={{ cursor: isSelected ? 'default' : nightsFull ? 'not-allowed' : 'pointer' }}
      >
        {/* ── Image with overlaid price ── */}
        <div className="hp-card-img-wrap">
          <img
            src={img}
            alt={hotel.name}
            className="hp-card-img"
            onError={e => { e.target.src = 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=600&q=80' }}
          />
          <span className={`hp-cat-badge hp-cat-${hotel.category}`}>{hotel.category}</span>
          {isSelected && (
            <div className="hp-selected-overlay">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><polyline points="20,6 9,17 4,12"/></svg>
              Selected · {selectedNights} night{selectedNights !== 1 ? 's' : ''}
            </div>
          )}
          <div className="hp-price-overlay">
            <span className="hp-pov-from">from</span>
            <span className="hp-pov-val">{sym}{typeof priceMin === 'number' ? priceMin.toLocaleString() : priceMin}{priceMax ? `–${priceMax.toLocaleString()}` : ''}</span>
            <span className="hp-pov-night">/night</span>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="hp-card-body">
          <div className="hp-card-head">
            <div className="hp-card-title-group">
              <h3 className="hp-card-name">{hotel.name}</h3>
              {city && (
                <p className="hp-card-city">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                  {city}
                </p>
              )}
            </div>
            <Stars count={hotel.starRating} />
          </div>

          <p className="hp-card-desc">{hotel.description?.slice(0, 150)}{hotel.description?.length > 150 ? '…' : ''}</p>

          {hotel.amenities?.length > 0 && (
            <div className="hp-amenities">
              {hotel.amenities.slice(0, 6).map(a => (
                <span key={a} className="hp-amenity-chip">{AMENITY_LABELS[a] || a}</span>
              ))}
            </div>
          )}

          {/* ── Actions ── */}
          <div className="hp-card-actions">
            <button
              className={`hp-reviews-toggle${showReviews ? ' active' : ''}`}
              onClick={e => { e.stopPropagation(); setShowReviews(s => !s) }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              {showReviews ? '✕ Hide Reviews' : '⭐ Reviews'}
            </button>
            {isSelected ? (
              <div className="hp-selected-actions">
                <button
                  className="hp-nights-edit-btn"
                  onClick={e => { e.stopPropagation(); onSelect(hotel) }}
                >
                  ✏️ {selectedNights} night{selectedNights !== 1 ? 's' : ''}
                </button>
                <button
                  className="hp-deselect-btn"
                  onClick={e => { e.stopPropagation(); onDeselect(hotel._id) }}
                >
                  ✕ Remove
                </button>
              </div>
            ) : nightsFull ? (
              <button className="hp-select-btn hp-select-full" disabled>
                🌙 Nights full — remove a hotel
              </button>
            ) : (
              <button className="hp-select-btn" onClick={e => { e.stopPropagation(); onSelect(hotel) }}>
                Select this Hotel
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
                  <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12,5 19,12 12,19"/>
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {showReviews && (
        <div className="hp-reviews-panel" onClick={e => e.stopPropagation()} style={{ marginTop: 0 }}>
          <ReviewSection
            targetType="hotel"
            targetId={String(hotel.place_id || hotel._id)}
            targetName={hotel.name}
            dbId={dbId}
          />
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════ */
export default function HotelPicker({ theme, toggleTheme }) {
  const navigate = useNavigate()
  const [destination,    setDestination]   = useState(null)
  const [selectedPlaces, setSelectedPlaces] = useState([])
  const [hotels,         setHotels]         = useState([])
  const [loading,        setLoading]        = useState(true)
  const [usingFallback,  setUsingFallback]  = useState(false)
  const [menuOpen,       setMenuOpen]       = useState(false)
  const [filterStar,     setFilterStar]     = useState(0)
  const [filterCat,      setFilterCat]      = useState('all')
  const [priceCurrency,  setPriceCurrency]  = useState(
    () => localStorage.getItem('et_displayCurrency') || 'LKR'
  )
  const [selectedHotels, setSelectedHotels] = useState([])   // [{ ...hotel, nights: N }]
  const [nightsModal,    setNightsModal]    = useState(null) // hotel._id being edited
  const [editNights,     setEditNights]     = useState(1)
  const [tripDays,       setTripDays]       = useState(null)
  const [pendingNew,     setPendingNew]     = useState(false) // true when modal is for a brand-new (unconfirmed) selection

  const CATEGORIES = [
    { value: 'all', label: 'All Types' },
    { value: 'resort', label: '🌴 Resort' },
    { value: 'boutique', label: '🏡 Boutique' },
    { value: 'hotel', label: '🏨 Hotel' },
    { value: 'villa', label: '🏛️ Villa' },
    { value: 'guesthouse', label: '🛖 Guesthouse' },
  ]

  // Load district from localStorage
  useEffect(() => {
    const raw = localStorage.getItem('selectedDistrict') || localStorage.getItem('selectedDestination')
    if (!raw) { navigate('/plan-trip'); return }
    const dest = JSON.parse(raw)
    setDestination(dest)

    const rawPlaces = localStorage.getItem('selectedPlaces')
    if (rawPlaces) setSelectedPlaces(JSON.parse(rawPlaces))

    // Restore previously selected hotels (when navigating back from TripBudget)
    const savedHotels = localStorage.getItem('selectedHotels')
    if (savedHotels) {
      try { setSelectedHotels(JSON.parse(savedHotels)) } catch { /* ignore */ }
    }

    // Pre-apply hotel type filter from TripPreferences
    const rawPrefs = localStorage.getItem('tripPreferences')
    if (rawPrefs) {
      const prefs = JSON.parse(rawPrefs)
      const typeMap = { any:'all', budget:'guesthouse', midrange:'hotel', luxury:'resort', boutique:'boutique', villa:'villa' }
      if (prefs.hotelType && typeMap[prefs.hotelType]) {
        setFilterCat(typeMap[prefs.hotelType])
      }
      if (prefs.days) setTripDays(prefs.days)
    }

    // Fetch hotels from backend — new EER schema uses district_id
    const fetchHotels = async () => {
      try {
        let url = `${API_BASE}/hotels?limit=12`
        if (dest.district_id) {
          url = `${API_BASE}/hotels/district/${dest.district_id}`
        } else if (dest.id && !String(dest.id).startsWith('d')) {
          url += `&district_id=${encodeURIComponent(dest.id)}`
        }
        const res = await fetch(url)
        const data = await res.json()
        if (res.ok && data.success && data.data?.length > 0) {
          setHotels(data.data)
        } else {
          throw new Error('No hotels returned')
        }
      } catch {
        setHotels(getDistrictHotels(dest))
        setUsingFallback(true)
      } finally {
        setLoading(false)
      }
    }
    fetchHotels()
  }, [navigate])

  // Nights already committed to hotels OTHER than the one being edited
  const usedByOthers = (editingId) =>
    selectedHotels.filter(h => h._id !== editingId).reduce((s, h) => s + h.nights, 0)

  // Max nights allowed for the hotel currently in the modal
  const maxNightsFor = (editingId) =>
    tripDays ? Math.max(1, tripDays - usedByOthers(editingId)) : 30

  const handleSelect = (hotel) => {
    const existing = selectedHotels.find(h => h._id === hotel._id)
    if (existing) {
      // Re-open nights editor for already-selected hotel
      setEditNights(existing.nights)
      setPendingNew(false)
    } else {
      // Block adding a new hotel if all nights are already allocated
      const totalUsed = selectedHotels.reduce((s, h) => s + h.nights, 0)
      if (tripDays && totalUsed >= tripDays) return
      // Remaining nights after other hotels
      const remaining = tripDays ? Math.max(1, tripDays - usedByOthers(hotel._id)) : 1
      const defaultNights = Math.min(remaining, 1)
      setSelectedHotels(prev => [...prev, { ...hotel, nights: defaultNights }])
      setEditNights(defaultNights)
      setPendingNew(true)
    }
    setNightsModal(hotel._id)
  }

  const handleDeselect = (hotelId) => {
    setSelectedHotels(prev => prev.filter(h => h._id !== hotelId))
    if (nightsModal === hotelId) setNightsModal(null)
  }

  const handleConfirmNights = () => {
    setSelectedHotels(prev =>
      prev.map(h => h._id === nightsModal ? { ...h, nights: editNights } : h)
    )
    setPendingNew(false)
    setNightsModal(null)
  }

  const handleConfirmAll = () => {
    localStorage.setItem('selectedHotels', JSON.stringify(selectedHotels))
    // For backward compatibility with trip-budget
    if (selectedHotels.length >= 1) {
      const primary = selectedHotels[0]
      localStorage.setItem('selectedHotel', JSON.stringify({ ...primary, hotelNights: primary.nights }))
    }
    navigate('/trip-budget')
  }

  const handleSkip = () => {
    localStorage.removeItem('selectedHotel')
    localStorage.removeItem('selectedHotels')
    navigate('/trip-budget')
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('currentUser')
    clearUserData()
    navigate('/')
  }

  // Filter hotels
  const filtered = hotels.filter(h => {
    if (filterStar > 0 && h.starRating !== filterStar) return false
    if (filterCat !== 'all' && h.category !== filterCat) return false
    return true
  })

  return (
    <div className="hp-page">
      {/* ── Nav ── */}
      <nav className="dashboard-nav glass-nav">
        <div className="nav-container">
          <button className="logo" onClick={() => navigate('/dashboard')} style={{background:'none',border:'none',cursor:'pointer',padding:0}}>Travel<span>Genie</span></button>
          <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
            <span className={`hamburger ${menuOpen ? 'open' : ''}`} />
          </button>
          <ul className={`nav-menu ${menuOpen ? 'active' : ''}`}>
            <li><Link to="/dashboard">Dashboard</Link></li>
            <li><Link to="/plan-trip">Plan a Trip</Link></li>
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
      <section className="hp-hero">
        <div className="hp-hero-inner">
          <div className="hp-breadcrumb-hero">
            <div className="hp-step done" onClick={() => navigate('/plan-trip')} title="Choose District">
              <span className="hp-step-num">1</span>
              <span className="hp-step-label">District</span>
            </div>
            <div className="hp-step-line done" />
            <div className="hp-step done" onClick={() => navigate('/district-explore')} title="Pick Places">
              <span className="hp-step-num">2</span>
              <span className="hp-step-label">Places</span>
            </div>
            <div className="hp-step-line done" />
            <div className="hp-step done" onClick={() => navigate('/trip-preferences')} title="Set Preferences">
              <span className="hp-step-num">3</span>
              <span className="hp-step-label">Preferences</span>
            </div>
            <div className="hp-step-line done" />
            <div className="hp-step active">
              <span className="hp-step-num">4</span>
              <span className="hp-step-label">Hotel</span>
            </div>
            <div className="hp-step-line" />
            <div className="hp-step">
              <span className="hp-step-num">5</span>
              <span className="hp-step-label">Budget</span>
            </div>
            <div className="hp-step-line" />
            <div className="hp-step">
              <span className="hp-step-num">6</span>
              <span className="hp-step-label">Details</span>
            </div>
          </div>
          <p className="hp-eyebrow">🏨 Step 4 — Choose Your Hotel</p>
          <h1>
            Hotels nearest to <em>{destination?.name}</em>
          </h1>
          <p className="hp-hero-sub">
            Hotels chosen for their proximity to your selected places. Pick the perfect stay and view prices in your preferred currency.
          </p>
          {destination && (
            <div className="hp-dest-pill">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              {destination.name}{destination.province ? ` · ${destination.province} Province` : destination.city ? ` · ${destination.city}` : ''}
            </div>
          )}
        </div>
      </section>

      {/* ── Selected Places Section ── */}
      {selectedPlaces.length > 0 && (
        <div className="hp-places-section">
          <div className="hp-places-sec-inner">
            <div className="hp-places-sec-header">
              <div>
                <h2 className="hp-places-sec-title">
                  📍 Your Itinerary Stops
                  <span className="hp-places-count">{selectedPlaces.length}</span>
                </h2>
                <p className="hp-places-sec-sub">Hotels shown below are selected for their proximity to these locations</p>
              </div>
            </div>
            <div className="hp-places-scroll">
              {selectedPlaces.map((place, i) => (
                <div key={place.id || i} className="hp-place-card">
                  <div className="hp-place-card-top">
                    <span className="hp-place-num">{i + 1}</span>
                    <span className="hp-place-type">{TYPE_ICONS[place.type] || '📌'} {place.type}</span>
                  </div>
                  <h3 className="hp-place-name">{place.name}</h3>
                  {place.duration && (
                    <div className="hp-place-duration">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>
                      {place.duration}
                    </div>
                  )}
                  {place.description && (
                    <p className="hp-place-desc">{place.description.slice(0, 95)}{place.description.length > 95 ? '…' : ''}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="hp-content">
        {/* ── Main Filter Bar ── */}
        <div className="hp-filters">
          <div className="hp-filter-group">
            <span className="hp-filter-label">Type</span>
            <div className="hp-filter-divider" />
            <div className="hp-pills">
              {CATEGORIES.map(c => (
                <button
                  key={c.value}
                  className={`hp-pill${filterCat === c.value ? ' active' : ''}`}
                  onClick={() => setFilterCat(c.value)}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          <div className="hp-filter-sep" />
          <div className="hp-filter-group">
            <span className="hp-filter-label">Stars</span>
            <div className="hp-filter-divider" />
            <div className="hp-pills">
              {[0, 3, 4, 5].map(s => (
                <button
                  key={s}
                  className={`hp-pill${filterStar === s ? ' active' : ''}`}
                  onClick={() => setFilterStar(s)}
                >
                  {s === 0 ? 'Any' : `${s}★`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Currency Selector ── */}
        <div className="hp-currency-bar">
          <div className="hp-currency-bar-left">
            <span className="hp-currency-bar-icon">💱</span>
            <div>
              <p className="hp-currency-bar-title">Display prices in</p>
              <p className="hp-currency-bar-sub">Approximate conversion from USD</p>
            </div>
          </div>
          <div className="hp-currency-options">
            {DISPLAY_CURRENCIES.map(c => (
              <button
                key={c.code}
                className={`hp-currency-opt${priceCurrency === c.code ? ' active' : ''}`}
                onClick={() => setPriceCurrency(c.code)}
              >
                <span className="hp-co-sym">{c.symbol}</span>
                <span className="hp-co-code">{c.code}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Status ── */}
        <div className="hp-status">
          {loading
            ? `Finding hotels nearest to your places in ${destination?.name || 'your district'}…`
            : `${filtered.length} hotel${filtered.length !== 1 ? 's' : ''} near ${destination?.name || 'your district'}${usingFallback ? ' · Sample data' : ''}`
          }
        </div>

        {/* ── Grid ── */}
        {loading ? (
          <div className="hp-skeleton-grid">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="hp-skeleton-card">
                <div className="hp-skeleton-img" />
                <div className="hp-skeleton-body">
                  <div className="hp-skel-line w70" />
                  <div className="hp-skel-line w45" />
                  <div className="hp-skel-line w90" />
                  <div className="hp-skel-line w60" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="hp-empty">
            <span>🏨</span>
            <h3>No hotels match that filter</h3>
            <button className="hp-clear-btn" onClick={() => { setFilterCat('all'); setFilterStar(0) }}>
              Clear filters
            </button>
          </div>
        ) : (
          <div className="hp-grid">
            {(() => {
              const totalNightsUsed = selectedHotels.reduce((s, h) => s + h.nights, 0)
              const nightsFull = tripDays != null && totalNightsUsed >= tripDays
              return filtered.map(h => {
                const sel = selectedHotels.some(s => s._id === h._id)
                return (
                  <HotelCard
                    key={h._id}
                    hotel={h}
                    onSelect={handleSelect}
                    onDeselect={handleDeselect}
                    isSelected={sel}
                    selectedNights={selectedHotels.find(s => s._id === h._id)?.nights}
                    displayCurrency={priceCurrency}
                    nightsFull={!sel && nightsFull}
                  />
                )
              })
            })()}
          </div>
        )}

        {/* ── Bottom nav bar ── */}
        <div className="hp-bottom-nav">
          <button className="hp-back-btn" onClick={() => navigate('/trip-preferences')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
              <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12,19 5,12 12,5"/>
            </svg>
            Back
          </button>
          <div className="hp-bottom-center">
            {selectedHotels.length > 0 ? (
              <div className="hp-footer-strip">
                {selectedHotels.map(h => {
                  const img = h.images?.[0]?.url || 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=200&q=60'
                  return (
                    <div key={h._id} className="hp-footer-chip">
                      <div className="hp-footer-chip-img-wrap">
                        <img src={img} alt={h.name} className="hp-footer-chip-img" />
                        <button
                          type="button"
                          className="hp-footer-chip-remove"
                          onClick={() => handleDeselect(h._id)}
                          title="Remove"
                        >✕</button>
                      </div>
                      <div className="hp-footer-chip-info">
                        <span className="hp-footer-chip-name">{h.name}</span>
                        <span className="hp-footer-chip-nights">
                          🌙 {h.nights} night{h.nights !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="hp-bottom-hint">Not sure yet? You can always add a hotel later.</p>
            )}
          </div>
          <button
            type="button"
            className={selectedHotels.length > 0 ? 'hp-confirm-btn' : 'hp-skip-outline'}
            onClick={() => selectedHotels.length > 0 ? handleConfirmAll() : handleSkip()}
          >
            {selectedHotels.length > 0 ? 'Confirm & Continue' : 'Continue without hotel'}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
              <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12,5 19,12 12,19"/>
            </svg>
          </button>
        </div>
      </div>

      {/* ── Nights modal ── */}
      {nightsModal && (() => {
        const pendingHotel = selectedHotels.find(h => h._id === nightsModal)
        if (!pendingHotel) return null
        const maxN = maxNightsFor(nightsModal)
        const usedOthers = usedByOthers(nightsModal)
        return (
          <div className="hp-nights-overlay" onClick={() => {
            // If the hotel was just added and never confirmed, remove it on backdrop dismiss
            if (pendingNew) { handleDeselect(nightsModal) }
            else setNightsModal(null)
          }}>
            <div className="hp-nights-modal" onClick={e => e.stopPropagation()}>
              <h2 className="hp-nights-title">🌙 How many nights?</h2>
              <p className="hp-nights-sub">
                <strong>{pendingHotel.name}</strong> &mdash; set how many nights you'll stay
              </p>

              {tripDays && (
                <div className="hp-nights-budget">
                  <div className="hp-nights-budget-bar">
                    <div
                      className="hp-nights-budget-used"
                      style={{ width: `${Math.min(100, (usedOthers / tripDays) * 100)}%` }}
                    />
                    <div
                      className="hp-nights-budget-current"
                      style={{ width: `${Math.min(100, (editNights / tripDays) * 100)}%` }}
                    />
                  </div>
                  <p className="hp-nights-budget-label">
                    {usedOthers + editNights} / {tripDays} nights used
                    {maxN <= 1 && usedOthers + editNights >= tripDays ? ' — trip fully allocated' : ''}
                  </p>
                </div>
              )}

              <div className="hp-nights-control">
                <button
                  className="hp-nights-btn"
                  disabled={editNights <= 1}
                  onClick={() => setEditNights(n => Math.max(1, n - 1))}
                >−</button>
                <div className="hp-nights-display">
                  <span className="hp-nights-num">{editNights}</span>
                  <span className="hp-nights-unit">{editNights === 1 ? 'night' : 'nights'}</span>
                </div>
                <button
                  className="hp-nights-btn"
                  disabled={editNights >= maxN}
                  onClick={() => setEditNights(n => Math.min(maxN, n + 1))}
                >+</button>
              </div>
              {pendingHotel.priceRange?.min && (
                <p className="hp-nights-cost">
                  Estimated cost: <strong>
                    {(() => {
                      const sym = { LKR: 'Rs', USD: '$', EUR: '€' }[priceCurrency] || '$'
                      const rate = { LKR: 300, USD: 1, EUR: 0.92 }[priceCurrency] || 1
                      const total = Math.round(pendingHotel.priceRange.min * rate * editNights)
                      return `${sym}${total.toLocaleString()} ${priceCurrency}`
                    })()}
                  </strong> ({editNights} &times; {(() => {
                    const sym = { LKR: 'Rs', USD: '$', EUR: '€' }[priceCurrency] || '$'
                    const rate = { LKR: 300, USD: 1, EUR: 0.92 }[priceCurrency] || 1
                    return `${sym}${Math.round(pendingHotel.priceRange.min * rate).toLocaleString()}`
                  })()}/night)
                </p>
              )}
              <div className="hp-nights-actions">
                <button className="hp-nights-cancel" onClick={() => { handleDeselect(nightsModal) }}>Remove Hotel</button>
                <button className="hp-nights-confirm" onClick={handleConfirmNights}>
                  Confirm Selection
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
