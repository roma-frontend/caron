import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Vehicle { brand: string; model: string; year: string }

/** Stable key for a vehicle (used for dedupe/active matching). */
export function vehicleKey(v: Vehicle): string {
  return [v.brand, v.model, v.year].join('|').toLowerCase();
}

interface VehicleState {
  /** Active vehicle (kept for backward compatibility across the app). */
  vehicle: Vehicle | null;
  /** "Мой гараж" — list of saved vehicles. */
  garage: Vehicle[];
  /** Set active vehicle and add it to the garage if new. */
  setVehicle: (v: Vehicle) => void;
  /** Add a vehicle to the garage (and make it active) without leaving the page. */
  addVehicle: (v: Vehicle) => void;
  /** Make an already-saved vehicle active. */
  selectVehicle: (v: Vehicle) => void;
  /** Remove a vehicle from the garage; clears active if it was active. */
  removeVehicle: (v: Vehicle) => void;
  /** Clear the active vehicle (garage is kept). */
  clear: () => void;
}

export const useVehicleStore = create<VehicleState>()(
  persist(
    (set, get) => ({
      vehicle: null,
      garage: [],
      setVehicle: (vehicle) => {
        const exists = get().garage.some((g) => vehicleKey(g) === vehicleKey(vehicle));
        set((s) => ({
          vehicle,
          garage: exists ? s.garage : [vehicle, ...s.garage].slice(0, 10),
        }));
      },
      addVehicle: (vehicle) => {
        const exists = get().garage.some((g) => vehicleKey(g) === vehicleKey(vehicle));
        set((s) => ({
          vehicle,
          garage: exists ? s.garage : [vehicle, ...s.garage].slice(0, 10),
        }));
      },
      selectVehicle: (vehicle) => set({ vehicle }),
      removeVehicle: (vehicle) => set((s) => {
        const garage = s.garage.filter((g) => vehicleKey(g) !== vehicleKey(vehicle));
        const stillActive = s.vehicle && vehicleKey(s.vehicle) !== vehicleKey(vehicle) ? s.vehicle : null;
        return { garage, vehicle: stillActive };
      }),
      clear: () => set({ vehicle: null }),
    }),
    { name: 'vehicle-storage' },
  ),
);
