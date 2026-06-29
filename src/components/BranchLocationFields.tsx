"use client";

import { useEffect, useState } from "react";

const countryCityOptions = [
  {
    country: "United Arab Emirates",
    cities: ["Abu Dhabi", "Dubai", "Sharjah", "Ajman", "Ras Al Khaimah", "Fujairah", "Umm Al Quwain", "Al Ain"],
  },
  {
    country: "Saudi Arabia",
    cities: ["Riyadh", "Jeddah", "Makkah", "Madinah", "Dammam", "Khobar", "Dhahran", "Taif", "Tabuk", "Abha", "Hail", "Jubail"],
  },
  {
    country: "Kuwait",
    cities: ["Kuwait City", "Hawalli", "Salmiya", "Farwaniya", "Ahmadi", "Jahra"],
  },
  {
    country: "Qatar",
    cities: ["Doha", "Al Rayyan", "Al Wakrah", "Lusail", "Al Khor", "Umm Salal"],
  },
  {
    country: "Bahrain",
    cities: ["Manama", "Muharraq", "Riffa", "Hamad Town", "Isa Town", "Sitra"],
  },
  {
    country: "Oman",
    cities: ["Muscat", "Salalah", "Sohar", "Nizwa", "Sur", "Seeb"],
  },
  {
    country: "Jordan",
    cities: ["Amman", "Zarqa", "Irbid", "Aqaba", "Salt", "Madaba"],
  },
  {
    country: "Lebanon",
    cities: ["Beirut", "Tripoli", "Sidon", "Tyre", "Zahle", "Jounieh"],
  },
  {
    country: "Egypt",
    cities: ["Cairo", "Alexandria", "Giza", "Mansoura", "Tanta", "Aswan", "Luxor", "Port Said", "Suez"],
  },
  {
    country: "Iraq",
    cities: ["Baghdad", "Basra", "Erbil", "Mosul", "Najaf", "Karbala", "Sulaymaniyah"],
  },
  {
    country: "Syria",
    cities: ["Damascus", "Aleppo", "Homs", "Hama", "Latakia", "Tartus"],
  },
  {
    country: "Palestine",
    cities: ["Jerusalem", "Ramallah", "Nablus", "Hebron", "Bethlehem", "Gaza", "Jenin"],
  },
  {
    country: "Yemen",
    cities: ["Sana'a", "Aden", "Taiz", "Hodeidah", "Mukalla", "Ibb"],
  },
] as const;

export function BranchLocationFields({ defaultCountry = "", defaultCity = "" }: { defaultCountry?: string; defaultCity?: string }) {
  const [selectedCountry, setSelectedCountry] = useState(defaultCountry);
  const cities = countryCityOptions.find((option) => option.country === selectedCountry)?.cities ?? [];

  useEffect(() => {
    setSelectedCountry(defaultCountry);
  }, [defaultCountry]);

  return (
    <>
      <label className="min-w-0 space-y-2">
        <span className="text-sm font-medium text-[#111827]">Country</span>
        <select
          name="country"
          value={selectedCountry}
          required
          onChange={(event) => setSelectedCountry(event.target.value)}
          className="h-11 w-full min-w-0 rounded-md border border-[#E5E7EB] bg-white px-3 text-sm text-[#111827] outline-none transition business-ring focus:ring-0"
        >
          <option value="">Select country</option>
          {countryCityOptions.map((option) => (
            <option key={option.country} value={option.country}>
              {option.country}
            </option>
          ))}
        </select>
      </label>

      <label className="min-w-0 space-y-2">
        <span className="text-sm font-medium text-[#111827]">City</span>
        <select
          key={selectedCountry}
          name="city"
          defaultValue={cities.some((city) => city === defaultCity) ? defaultCity : ""}
          required
          disabled={!selectedCountry}
          className="h-11 w-full min-w-0 rounded-md border border-[#E5E7EB] bg-white px-3 text-sm text-[#111827] outline-none transition disabled:cursor-not-allowed disabled:bg-[#F9FAFB] disabled:text-[#9CA3AF] business-ring focus:ring-0"
        >
          <option value="">{selectedCountry ? "Select city" : "Select country first"}</option>
          {cities.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}
