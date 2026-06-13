import { NextResponse } from 'next/server';

interface DecodedValue {
  Variable: string;
  Value: string;
  ValueId: string;
}

interface VinResponse {
  Results: DecodedValue[];
  Message: string;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const vin = searchParams.get('vin');

  if (!vin || vin.length !== 17) {
    return NextResponse.json({ error: 'Անվավեր VIN համար: Մուտքագրեք 17 նիշանոց VIN կոդ:' }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/${encodeURIComponent(vin)}?format=json`,
      { signal: AbortSignal.timeout(8000) }
    );

    if (!res.ok) {
      throw new Error(`NHTSA API error: ${res.status}`);
    }

    const data: VinResponse = await res.json();

    const get = (variable: string) =>
      data.Results.find((r) => r.Variable === variable)?.Value || '';

    const make = get('Make');
    const model = get('Model');
    const year = get('Model Year');
    const engineModel = get('Engine Model');
    const engineHP = get('Engine HP');
    const displacement = get('Displacement (L)');
    const fuelType = get('Fuel Type - Primary');
    const driveType = get('Drive Type');
    const bodyClass = get('Body Class');
    const transmission = get('Transmission Style');
    const trim = get('Trim');
    const plantCountry = get('Plant Country');
    const manufacturer = get('Manufacturer Name');

    return NextResponse.json({
      vin,
      make: make || null,
      model: model || null,
      year: year ? parseInt(year, 10) : null,
      engine: engineModel || null,
      engineHP: engineHP || null,
      displacement: displacement || null,
      fuelType: fuelType || null,
      driveType: driveType || null,
      bodyClass: bodyClass || null,
      transmission: transmission || null,
      trim: trim || null,
      plantCountry: plantCountry || null,
      manufacturer: manufacturer || null,
      searchQuery: [make, model, year].filter(Boolean).join(' '),
    });
  } catch {
    return NextResponse.json(
      { error: 'VIN ապակոդավորման սխալ: Փորձեք կրկին:' },
      { status: 500 }
    );
  }
}
