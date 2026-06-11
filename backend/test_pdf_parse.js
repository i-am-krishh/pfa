import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

console.log("pdf.PDFParse type:", typeof pdf.PDFParse);
if (typeof pdf.PDFParse === 'function') {
    console.log("pdf.PDFParse arguments/details:", pdf.PDFParse.toString().substring(0, 150));
}
