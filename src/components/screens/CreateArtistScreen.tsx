import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { Button, Badge } from '../ui/Card';
import { BACKGROUNDS } from '../../data/backgrounds';
import { getContinents, getCountriesByContinent, getCitiesByCountry } from '../../data/locations';
import type { Background, Gender, Genre } from '../../types/game';
import { GENRE_LIST } from '../../data/genres';

const GENRES = GENRE_LIST;

const GENDERS: { id: Gender; label: string }[] = [
  { id: 'male', label: 'Male' },
  { id: 'female', label: 'Female' },
  { id: 'non_binary', label: 'Non-Binary' },
  { id: 'prefer_not_to_say', label: 'Prefer not to say' },
];

export function CreateArtistScreen() {
  const { createPlayer } = useGameStore();

  const [step, setStep] = useState(1);
  const [artistName, setArtistName] = useState('');
  const [realName, setRealName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('2000-01-01');
  const [gender, setGender] = useState<Gender>('male');
  const [genre, setGenre] = useState<Genre>('hip_hop');
  const [continent, setContinent] = useState('Africa');
  const [country, setCountry] = useState('Ghana');
  const [city, setCity] = useState('Accra');
  const [background, setBackground] = useState<Background>('broke_hustler');

  const continents = getContinents();
  const countries = getCountriesByContinent(continent);
  const cities = getCitiesByCountry(country);

  function handleContinentChange(c: string) {
    setContinent(c);
    const firstCountry = getCountriesByContinent(c)[0];
    if (firstCountry) {
      setCountry(firstCountry.name);
      setCity(firstCountry.cities[0]?.name ?? '');
    }
  }

  function handleCountryChange(c: string) {
    setCountry(c);
    setCity(getCitiesByCountry(c)[0]?.name ?? '');
  }

  function handleSubmit() {
    if (!artistName.trim()) return;
    createPlayer({
      artistName: artistName.trim(),
      realName: realName.trim(),
      dateOfBirth,
      gender,
      genre,
      continent,
      country,
      city,
      background,
    });
  }

  const selectedBG = BACKGROUNDS.find(b => b.id === background);
  const selectedGenre = GENRES.find(g => g.id === genre);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl">
        {/* Header */}
        <div className="text-center mb-8">
          <span className="text-xs tracking-[0.3em] text-yellow-500 uppercase font-bold">Step {step} of 3</span>
          <h2 className="text-3xl font-black mt-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            {step === 1 ? 'Who Are You?' : step === 2 ? 'Your Sound & Origin' : 'Your Background'}
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            {step === 1 ? 'Tell us about your artist identity' : step === 2 ? 'Where you from? What you making?' : 'Where are you starting?'}
          </p>
        </div>

        {/* Progress */}
        <div className="flex gap-2 mb-8">
          {[1, 2, 3].map(s => (
            <div
              key={s}
              className={`flex-1 h-1 rounded-full transition-all ${s <= step ? 'bg-yellow-500' : 'bg-gray-800'}`}
            />
          ))}
        </div>

        {/* STEP 1: Identity */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider">Artist Name *</label>
              <input
                className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white text-lg placeholder-gray-600 focus:outline-none focus:border-yellow-500 transition-colors"
                placeholder="What do they call you?"
                value={artistName}
                onChange={e => setArtistName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider">Real Name (Optional)</label>
              <input
                className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-yellow-500 transition-colors"
                placeholder="Birth name"
                value={realName}
                onChange={e => setRealName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider">Date of Birth</label>
              <input
                type="date"
                className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-500 transition-colors"
                value={dateOfBirth}
                onChange={e => setDateOfBirth(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider">Gender</label>
              <div className="grid grid-cols-2 gap-2">
                {GENDERS.map(g => (
                  <button
                    key={g.id}
                    onClick={() => setGender(g.id)}
                    className={`py-2 px-4 rounded-xl text-sm transition-all ${
                      gender === g.id
                        ? 'bg-yellow-500 text-black font-bold'
                        : 'bg-gray-900 border border-gray-800 text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Sound & Origin */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider">Genre / Style</label>
              <div className="grid grid-cols-2 gap-2">
                {GENRES.map(g => (
                  <button
                    key={g.id}
                    onClick={() => setGenre(g.id)}
                    className={`py-3 px-4 rounded-xl text-sm transition-all flex items-center gap-2 ${
                      genre === g.id
                        ? 'bg-yellow-500 text-black font-bold'
                        : 'bg-gray-900 border border-gray-800 text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    <span>{g.emoji}</span>
                    {g.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider">Continent</label>
              <select
                className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-500"
                value={continent}
                onChange={e => handleContinentChange(e.target.value)}
              >
                {continents.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider">Country</label>
              <select
                className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-500"
                value={country}
                onChange={e => handleCountryChange(e.target.value)}
              >
                {countries.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider">City</label>
              <select
                className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-500"
                value={city}
                onChange={e => setCity(e.target.value)}
              >
                {cities.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
            </div>
          </div>
        )}

        {/* STEP 3: Background */}
        {step === 3 && (
          <div className="space-y-4">
            {BACKGROUNDS.map(bg => (
              <button
                key={bg.id}
                onClick={() => setBackground(bg.id)}
                className={`w-full text-left p-4 rounded-2xl border transition-all ${
                  background === bg.id
                    ? 'bg-yellow-500/10 border-yellow-500 text-white'
                    : 'bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-600'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{bg.emoji}</span>
                  <span className="font-bold text-white">{bg.label}</span>
                  <span className="text-xs text-yellow-500 ml-auto">${bg.startingMoney.toLocaleString()} start</span>
                </div>
                <p className="text-sm text-gray-500">{bg.description}</p>
                <div className="mt-3 flex flex-wrap gap-1">
                  {Object.entries(bg.statBoosts)
                    .filter(([, v]) => (v ?? 0) > 0)
                    .slice(0, 4)
                    .map(([stat, val]) => (
                      <Badge key={stat} color="green">+{val} {stat.replace(/([A-Z])/g, ' $1').trim()}</Badge>
                    ))}
                  {Object.entries(bg.statBoosts)
                    .filter(([, v]) => (v ?? 0) < 0)
                    .slice(0, 2)
                    .map(([stat, val]) => (
                      <Badge key={stat} color="red">{val} {stat.replace(/([A-Z])/g, ' $1').trim()}</Badge>
                    ))}
                </div>
              </button>
            ))}

            {/* Summary */}
            {selectedBG && (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 mt-4">
                <h3 className="text-sm font-bold text-yellow-400 mb-2">Your Artist Card</h3>
                <div className="grid grid-cols-2 gap-1 text-xs text-gray-400">
                  <span>🎤 {artistName || '???'}</span>
                  <span>🌍 {city}, {country}</span>
                  <span>{selectedGenre?.emoji} {selectedGenre?.label}</span>
                  <span>💰 ${selectedBG.startingMoney.toLocaleString()}</span>
                  <span>👥 {selectedBG.startingFanbase} fans</span>
                  <span>⭐ Local Fame: {selectedBG.startingFame.local}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3 mt-8">
          {step > 1 && (
            <Button variant="secondary" onClick={() => setStep(s => s - 1)}>
              ← Back
            </Button>
          )}
          {step < 3 ? (
            <Button
              variant="gold"
              className="flex-1"
              onClick={() => setStep(s => s + 1)}
              disabled={step === 1 && !artistName.trim()}
            >
              Continue →
            </Button>
          ) : (
            <Button
              variant="gold"
              className="flex-1"
              onClick={handleSubmit}
              disabled={!artistName.trim()}
            >
              🎤 Start Your Career
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
