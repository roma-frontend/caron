// Shared Year/Make/Model fitment data (single source of truth).
// Covers brands popular in Armenia with years 2000-2026.

function yrs(from: number, to: number): string[] {
  const a: string[] = [];
  for (let y = from; y <= to; y++) a.push(String(y));
  return a;
}

export const CAR_DATA: Record<string, Record<string, string[]>> = {
  Toyota: {
    Camry: yrs(2001, 2026), Corolla: yrs(2000, 2026), RAV4: yrs(2000, 2026),
    'Land Cruiser 200': yrs(2007, 2021), 'Land Cruiser 300': yrs(2021, 2026),
    'Land Cruiser Prado': yrs(2002, 2026), Prius: yrs(2003, 2023),
    Highlander: yrs(2007, 2026), Yaris: yrs(2005, 2023), Avalon: yrs(2005, 2022),
    '4Runner': yrs(2003, 2026), Sequoia: yrs(2008, 2026), Tundra: yrs(2007, 2026),
    Hilux: yrs(2005, 2026), Fortuner: yrs(2015, 2026), 'C-HR': yrs(2016, 2026),
  },
  Lexus: {
    RX: yrs(2003, 2026), NX: yrs(2014, 2026), ES: yrs(2006, 2026),
    IS: yrs(2005, 2026), GX: yrs(2003, 2026), LX: yrs(2007, 2026),
    UX: yrs(2018, 2026), LS: yrs(2006, 2023),
  },
  BMW: {
    '3 Series': yrs(2000, 2026), '5 Series': yrs(2000, 2026), '7 Series': yrs(2001, 2026),
    X1: yrs(2009, 2026), X3: yrs(2004, 2026), X5: yrs(2000, 2026),
    X6: yrs(2008, 2026), X7: yrs(2019, 2026), '4 Series': yrs(2013, 2026),
  },
  'Mercedes-Benz': {
    'C-Class': yrs(2000, 2026), 'E-Class': yrs(2000, 2026), 'S-Class': yrs(2000, 2026),
    GLC: yrs(2015, 2026), GLE: yrs(2011, 2026), GLS: yrs(2015, 2026),
    'A-Class': yrs(2012, 2026), CLA: yrs(2013, 2026), GLB: yrs(2019, 2026),
    'G-Class': yrs(2000, 2026), ML: yrs(2000, 2015), GL: yrs(2006, 2015),
  },
  Hyundai: {
    Tucson: yrs(2004, 2026), 'Santa Fe': yrs(2001, 2026), Elantra: yrs(2000, 2026),
    Sonata: yrs(2000, 2026), Creta: yrs(2016, 2026), Accent: yrs(2000, 2026),
    ix35: yrs(2010, 2015), i30: yrs(2007, 2026), Palisade: yrs(2019, 2026),
    Kona: yrs(2017, 2026), Venue: yrs(2019, 2026),
  },
  Kia: {
    Sportage: yrs(2004, 2026), Sorento: yrs(2002, 2026), Cerato: yrs(2004, 2026),
    Seltos: yrs(2019, 2026), Rio: yrs(2005, 2026), Optima: yrs(2010, 2020),
    K5: yrs(2020, 2026), Soul: yrs(2009, 2026), Carnival: yrs(2014, 2026),
    Stinger: yrs(2017, 2023), Telluride: yrs(2019, 2026),
  },
  Nissan: {
    Qashqai: yrs(2007, 2026), 'X-Trail': yrs(2001, 2026), Juke: yrs(2010, 2026),
    Patrol: yrs(2000, 2026), Pathfinder: yrs(2004, 2026), Note: yrs(2005, 2020),
    Tiida: yrs(2004, 2015), Murano: yrs(2003, 2024), Sentra: yrs(2012, 2022),
    Navara: yrs(2005, 2026), Kicks: yrs(2016, 2026),
  },
  Honda: {
    Civic: yrs(2000, 2026), 'CR-V': yrs(2000, 2026), Accord: yrs(2000, 2026),
    'HR-V': yrs(2015, 2026), Pilot: yrs(2003, 2026), Fit: yrs(2001, 2020),
    'CR-Z': yrs(2010, 2016),
  },
  Mitsubishi: {
    Outlander: yrs(2003, 2026), Pajero: yrs(2000, 2021), 'Pajero Sport': yrs(2008, 2026),
    Lancer: yrs(2000, 2017), ASX: yrs(2010, 2026), Eclipse: yrs(2017, 2026),
    L200: yrs(2005, 2026),
  },
  Volkswagen: {
    Golf: yrs(2000, 2026), Tiguan: yrs(2007, 2026), Passat: yrs(2000, 2026),
    Polo: yrs(2002, 2026), Touareg: yrs(2002, 2026), Jetta: yrs(2005, 2026),
    'T-Roc': yrs(2017, 2026), Arteon: yrs(2017, 2026), ID4: yrs(2020, 2026),
  },
  Audi: {
    A3: yrs(2003, 2026), A4: yrs(2000, 2026), A6: yrs(2000, 2026), A8: yrs(2002, 2026),
    Q3: yrs(2011, 2026), Q5: yrs(2008, 2026), Q7: yrs(2005, 2026), Q8: yrs(2018, 2026),
    'e-tron': yrs(2019, 2026),
  },
  Ford: {
    Focus: yrs(2000, 2022), Kuga: yrs(2008, 2026), Mondeo: yrs(2000, 2022),
    Explorer: yrs(2006, 2026), Fiesta: yrs(2002, 2023), EcoSport: yrs(2012, 2022),
    Ranger: yrs(2006, 2026), Mustang: yrs(2005, 2026), Escape: yrs(2001, 2026),
  },
  Chevrolet: {
    Cruze: yrs(2009, 2019), Malibu: yrs(2004, 2024), Captiva: yrs(2006, 2018),
    Equinox: yrs(2005, 2026), Tahoe: yrs(2000, 2026), Camaro: yrs(2010, 2024),
    Spark: yrs(2005, 2022), Aveo: yrs(2003, 2020), Lacetti: yrs(2003, 2013),
    Cobalt: yrs(2012, 2022), Tracker: yrs(2019, 2026),
  },
  Subaru: {
    Forester: yrs(2002, 2026), Outback: yrs(2003, 2026), XV: yrs(2012, 2026),
    Impreza: yrs(2000, 2026), Legacy: yrs(2003, 2022), WRX: yrs(2014, 2026),
  },
  Mazda: {
    CX5: yrs(2012, 2026), 'CX-9': yrs(2007, 2026), 'CX-30': yrs(2019, 2026),
    '3': yrs(2003, 2026), '6': yrs(2002, 2023), 'CX-3': yrs(2015, 2023),
  },
  Opel: {
    Astra: yrs(2000, 2022), Corsa: yrs(2000, 2026), Grandland: yrs(2017, 2026),
    Insignia: yrs(2008, 2022), Mokka: yrs(2012, 2026), Zafira: yrs(2000, 2019),
  },
  Renault: {
    Duster: yrs(2010, 2026), Logan: yrs(2004, 2026), Sandero: yrs(2007, 2026),
    Megane: yrs(2002, 2023), Captur: yrs(2013, 2026), Koleos: yrs(2008, 2026),
    Arkana: yrs(2019, 2026),
  },
  Peugeot: {
    '208': yrs(2012, 2026), '308': yrs(2007, 2026), '3008': yrs(2009, 2026),
    '5008': yrs(2009, 2026), '2008': yrs(2013, 2026), '508': yrs(2010, 2026),
  },
  Skoda: {
    Octavia: yrs(2000, 2026), Kodiaq: yrs(2016, 2026), Karoq: yrs(2017, 2026),
    Superb: yrs(2001, 2026), Rapid: yrs(2012, 2022), Fabia: yrs(2000, 2026),
  },
  Suzuki: {
    Vitara: yrs(2005, 2026), 'Grand Vitara': yrs(2000, 2018), 'SX4': yrs(2006, 2021),
    Swift: yrs(2004, 2026), Jimny: yrs(2000, 2026), 'S-Cross': yrs(2013, 2026),
  },
  Volvo: {
    XC60: yrs(2008, 2026), XC90: yrs(2002, 2026), XC40: yrs(2017, 2026),
    S60: yrs(2000, 2026), S90: yrs(2016, 2026), V60: yrs(2010, 2026),
  },
  'Land Rover': {
    'Range Rover': yrs(2002, 2026), 'Range Rover Sport': yrs(2005, 2026),
    Discovery: yrs(2004, 2026), Defender: yrs(2019, 2026),
    Freelander: yrs(2000, 2014), Evoque: yrs(2011, 2026),
  },
  Jeep: {
    'Grand Cherokee': yrs(2000, 2026), Cherokee: yrs(2002, 2026),
    Wrangler: yrs(2007, 2026), Compass: yrs(2007, 2026), Renegade: yrs(2014, 2026),
  },
  Porsche: {
    Cayenne: yrs(2003, 2026), Macan: yrs(2014, 2026), Panamera: yrs(2009, 2026),
    '911': yrs(2004, 2026), Taycan: yrs(2019, 2026),
  },
  Lada: {
    Vesta: yrs(2015, 2026), Granta: yrs(2011, 2026), XRAY: yrs(2015, 2022),
    Niva: yrs(2000, 2026), Largus: yrs(2012, 2026), Priora: yrs(2007, 2018),
    '2107': yrs(2000, 2012), '2110': yrs(2000, 2014),
  },
  GAZ: {
    Gazelle: yrs(2000, 2026), 'Gazelle Next': yrs(2013, 2026),
    Sobol: yrs(2002, 2020),
  },
  UAZ: {
    Patriot: yrs(2005, 2026), Hunter: yrs(2003, 2024), Profi: yrs(2017, 2026),
  },
  Tesla: {
    'Model 3': yrs(2017, 2026), 'Model Y': yrs(2020, 2026),
    'Model S': yrs(2012, 2026), 'Model X': yrs(2015, 2026),
  },
  Geely: {
    Coolray: yrs(2019, 2026), Atlas: yrs(2018, 2026), Tugella: yrs(2020, 2026),
    Emgrand: yrs(2009, 2026), Monjaro: yrs(2022, 2026),
  },
  Chery: {
    Tiggo7: yrs(2016, 2026), Tiggo8: yrs(2018, 2026), Tiggo4: yrs(2017, 2026),
    Arrizo: yrs(2013, 2026),
  },
  Haval: {
    Jolion: yrs(2020, 2026), F7: yrs(2018, 2026), H6: yrs(2017, 2026),
    Dargo: yrs(2021, 2026),
  },
};

export const CAR_BRANDS = Object.keys(CAR_DATA);
