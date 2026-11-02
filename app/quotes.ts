// Short verified excerpts. Daily rotation follows Asia/Kolkata calendar days.
export const quotes = [
 {text:'I never give up.',source:'https://news.verstappen.com/en/article/4616',context:'Post-championship interview · 14 December 2021'},
 {text:'Never give up and keep believing in it, even when it looks almost impossible.',source:'https://news.verstappen.com/en/article/4619/',context:'Milton Keynes homecoming · 16 December 2021'},
 {text:'Try to always improve myself, every single year.',source:'https://news.verstappen.com/en/article/5709/',context:'Pre-season interview · 17 February 2025'},
 {text:'You always try to just be a little bit better.',source:'https://news.verstappen.com/en/article/5709/',context:'Pre-season interview · 17 February 2025'},
 {text:'We will enjoy it a little, but there are still quite a few races out there that we want to win!',source:'https://www.formula1.com/en/latest/article/verstappen-says-he-will-enjoy-latest-title-win-a-little-as-he-vows-to-push.4yuhLHFMW5VCgRxh8L1gTN',context:'Qatar Grand Prix · 8 October 2023'}
];
export function quoteForDate(date:string){return quotes[((Math.floor(Date.parse(date+'T00:00:00Z')/86400000)%quotes.length)+quotes.length)%quotes.length];}
