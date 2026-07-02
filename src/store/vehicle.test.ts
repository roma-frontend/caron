// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { useVehicleStore, vehicleKey, type Vehicle } from './vehicle';

const v = (over: Partial<Vehicle> = {}): Vehicle => ({
  brand: 'Toyota',
  model: 'Corolla',
  year: '2020',
  ...over,
});

beforeEach(() => {
  localStorage.clear();
  useVehicleStore.setState({ vehicle: null, garage: [] });
});

describe('vehicleKey', () => {
  it('builds a lowercased pipe-joined key', () => {
    expect(vehicleKey(v())).toBe('toyota|corolla|2020');
  });
});

describe('vehicle setVehicle / addVehicle', () => {
  it('sets active vehicle and adds it to the garage', () => {
    useVehicleStore.getState().setVehicle(v());
    expect(useVehicleStore.getState().vehicle).toEqual(v());
    expect(useVehicleStore.getState().garage).toHaveLength(1);
  });

  it('does not duplicate an existing garage entry', () => {
    useVehicleStore.getState().setVehicle(v());
    useVehicleStore.getState().setVehicle(v());
    expect(useVehicleStore.getState().garage).toHaveLength(1);
  });

  it('addVehicle prepends new vehicles and caps garage at 10', () => {
    for (let i = 0; i < 12; i++) {
      useVehicleStore.getState().addVehicle(v({ model: `M${i}` }));
    }
    expect(useVehicleStore.getState().garage).toHaveLength(10);
    expect(useVehicleStore.getState().garage[0].model).toBe('M11');
  });
});

describe('vehicle selectVehicle', () => {
  it('sets active without touching the garage', () => {
    useVehicleStore.getState().addVehicle(v());
    useVehicleStore.getState().selectVehicle(v({ model: 'Camry' }));
    expect(useVehicleStore.getState().vehicle?.model).toBe('Camry');
    expect(useVehicleStore.getState().garage).toHaveLength(1);
  });
});

describe('vehicle removeVehicle', () => {
  it('removes from garage and clears active if it was active', () => {
    useVehicleStore.getState().setVehicle(v());
    useVehicleStore.getState().removeVehicle(v());
    expect(useVehicleStore.getState().garage).toHaveLength(0);
    expect(useVehicleStore.getState().vehicle).toBeNull();
  });

  it('keeps active when a different vehicle is removed', () => {
    useVehicleStore.getState().addVehicle(v({ model: 'A' }));
    useVehicleStore.getState().addVehicle(v({ model: 'B' })); // active = B
    useVehicleStore.getState().removeVehicle(v({ model: 'A' }));
    expect(useVehicleStore.getState().vehicle?.model).toBe('B');
    expect(useVehicleStore.getState().garage).toHaveLength(1);
  });
});

describe('vehicle clear', () => {
  it('clears active but keeps the garage', () => {
    useVehicleStore.getState().setVehicle(v());
    useVehicleStore.getState().clear();
    expect(useVehicleStore.getState().vehicle).toBeNull();
    expect(useVehicleStore.getState().garage).toHaveLength(1);
  });
});
