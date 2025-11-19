import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfModule = require('pdf-parse');

console.log('pdf module type:', typeof pdfModule);
console.log('pdf module keys:', Object.keys(pdfModule).slice(0, 15));
console.log('PDFParse type:', typeof pdfModule.PDFParse);

// Check if there's a default function
if (typeof pdfModule === 'function') {
  console.log('Module is directly callable');
} else if (pdfModule.default && typeof pdfModule.default === 'function') {
  console.log('Module has default function');
} else if (typeof pdfModule.PDFParse === 'function') {
  console.log('Module has PDFParse constructor');
}
