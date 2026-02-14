// Mock for rxdb module to avoid loading actual database code in tests
export const getDatabase = jest.fn();
export const initDatabase = jest.fn();
export default { getDatabase, initDatabase };
