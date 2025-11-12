import { MemStorage } from '../server/storage.js';

async function listMpIds() {
  const storage = new MemStorage();
  const mps = await storage.getAllMps();
  
  console.log(`Total MPs: ${mps.length}`);
  console.log('\nFirst 10 MPs:');
  mps.slice(0, 10).forEach(mp => {
    console.log(`  ID: ${mp.id}, Name: ${mp.name}, Constituency: ${mp.constituency}`);
  });
  
  process.exit(0);
}

listMpIds();
