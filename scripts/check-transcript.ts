import { MemStorage } from '../server/storage.js';

async function checkTranscript() {
  const storage = new MemStorage();
  const records = await storage.getAllHansardRecords();
  const record = records.find(r => r.sessionNumber === 'DR.6.11.2025');
  
  if (!record) {
    console.log('Record not found');
    process.exit(0);
  }
  
  console.log('Session:', record.sessionNumber);
  console.log('Transcript length:', record.transcript.length);
  console.log('Speakers:', record.speakers);
  console.log('\nTranscript preview:');
  console.log(record.transcript.substring(0, 500));
  console.log('\n...');
  
  process.exit(0);
}

checkTranscript();
