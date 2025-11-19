import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire(import.meta.url);
const { PDFParse } = require('pdf-parse');

async function test() {
  const buffer = fs.readFileSync('attached_assets/DR-13112025_1763514446245.pdf');
  const parser = new PDFParse({ data: buffer });
  const pdfData = await parser.getText();
  await parser.destroy();
  
  const text = pdfData.text;
  console.log('Total pages:', pdfData.total);
  console.log('Text length:', text.length);
  console.log('\n=== First 3000 chars ===\n');
  console.log(text.slice(0, 3000));
  console.log('\n=== Looking for KANDUNGAN section ===\n');
  const kandunganMatch = text.match(/KANDUNGAN[\s\S]{0,500}/);
  console.log(kandunganMatch ? kandunganMatch[0] : 'NOT FOUND');
  
  console.log('\n=== Looking for Oral Questions section ===\n');
  const oralMatch = text.match(/PERTANYAAN-PERTANYAAN BAGI JAWAB LISAN[\s\S]{0,500}/i);
  console.log(oralMatch ? oralMatch[0] : 'NOT FOUND');
  
  console.log('\n=== Looking for Bills section ===\n');
  const billMatch = text.match(/RANG UNDANG-UNDANG[\s\S]{0,500}/i);
  console.log(billMatch ? billMatch[0] : 'NOT FOUND');
}

test();
