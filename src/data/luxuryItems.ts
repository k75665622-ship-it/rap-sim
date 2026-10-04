import type { LuxuryItem } from '../types/game';

export const LUXURY_CATALOG: LuxuryItem[] = [
  // Cars
  { id: 'toyota_camry', name: 'Toyota Camry', category: 'car', cost: 25_000, unlockThreshold: 50_000 },
  { id: 'mercedes_c', name: 'Mercedes C-Class', category: 'car', cost: 60_000, unlockThreshold: 200_000 },
  { id: 'porsche_911', name: 'Porsche 911', category: 'car', cost: 150_000, unlockThreshold: 500_000 },
  { id: 'ferrari', name: 'Ferrari Roma', category: 'car', cost: 350_000, unlockThreshold: 1_000_000 },
  { id: 'lamborghini', name: 'Lamborghini Urus', category: 'car', cost: 500_000, unlockThreshold: 2_000_000 },
  { id: 'rolls_royce', name: 'Rolls-Royce Ghost', category: 'car', cost: 750_000, unlockThreshold: 5_000_000 },

  // Homes
  { id: 'apartment_accra', name: 'Apartment in Accra', category: 'home', cost: 80_000, unlockThreshold: 100_000, disciplineBonus: 1 },
  { id: 'house_east_legon', name: 'House in East Legon', category: 'home', cost: 250_000, unlockThreshold: 500_000, disciplineBonus: 2 },
  { id: 'mansion_accra', name: 'Mansion in Accra', category: 'home', cost: 1_000_000, unlockThreshold: 2_000_000, disciplineBonus: 3 },
  { id: 'penthouse_lagos', name: 'Penthouse in Lagos', category: 'home', cost: 2_000_000, unlockThreshold: 5_000_000, disciplineBonus: 4 },
  { id: 'london_flat', name: 'London Flat', category: 'home', cost: 3_000_000, unlockThreshold: 8_000_000, disciplineBonus: 3 },
  { id: 'la_mansion', name: 'LA Mansion', category: 'home', cost: 10_000_000, unlockThreshold: 20_000_000, disciplineBonus: 5 },

  // Jewelry
  { id: 'gold_chain', name: 'Gold Chain', category: 'jewelry', cost: 5_000, unlockThreshold: 20_000 },
  { id: 'diamond_chain', name: 'Diamond Chain', category: 'jewelry', cost: 50_000, unlockThreshold: 200_000 },
  { id: 'diamond_ring', name: 'Diamond Ring', category: 'jewelry', cost: 30_000, unlockThreshold: 100_000 },
  { id: 'full_set', name: 'Full Iced Out Set', category: 'jewelry', cost: 500_000, unlockThreshold: 1_000_000 },

  // Watches
  { id: 'rolex', name: 'Rolex Submariner', category: 'watch', cost: 15_000, unlockThreshold: 50_000 },
  { id: 'patek', name: 'Patek Philippe Nautilus', category: 'watch', cost: 200_000, unlockThreshold: 500_000 },
  { id: 'richard_mille', name: 'Richard Mille RM11', category: 'watch', cost: 800_000, unlockThreshold: 3_000_000 },

  // Jets & Yachts
  { id: 'private_jet', name: 'Private Jet Charter Plan', category: 'jet', cost: 5_000_000, unlockThreshold: 20_000_000 },
  { id: 'yacht', name: 'Luxury Yacht', category: 'yacht', cost: 15_000_000, unlockThreshold: 50_000_000 },

  // Art
  { id: 'local_art', name: 'Contemporary Ghanaian Art Collection', category: 'art', cost: 20_000, unlockThreshold: 100_000 },
  { id: 'fine_art', name: 'International Fine Art Collection', category: 'art', cost: 2_000_000, unlockThreshold: 10_000_000 },
];
