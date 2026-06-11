import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

console.log("PDFParse class properties:");
const instance = new pdf.PDFParse({ data: Buffer.from([]) });
console.log("instance methods:", Object.getOwnPropertyNames(Object.getPrototypeOf(instance)));
console.log("instance keys:", Object.keys(instance));
