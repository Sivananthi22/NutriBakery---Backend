import ID from '../models/ID.js';

// Helper function to generate unique IDs
export async function generateUniqueID(prefix) {
  try {
    let idEntry = await ID.findOne({ name: prefix });

    if (!idEntry) {
      const newIdEntry = new ID({ name: prefix, value: 1 });
      await newIdEntry.save();
      console.log('Initialized ID for', prefix);
      return `${prefix}_001`;
    }

    idEntry.value += 1;
    await idEntry.save();
    console.log(`Generated new ID: ${prefix}_${String(idEntry.value).padStart(3, '0')}`);
    return `${prefix}_${String(idEntry.value).padStart(3, '0')}`;
  } catch (error) {
    console.error('Error generating unique ID:', error.message);
    throw new Error('Error generating unique ID');
  }
}
