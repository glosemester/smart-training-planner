const fs = require('fs');
const path = require('path');

const dir = 'dist/assets';
const files = fs.readdirSync(dir);
const jsFile = files.find(f => f.startsWith('index-') && f.endsWith('.js'));

if (!jsFile) {
    console.log('No index js file found');
    process.exit(1);
}

const content = fs.readFileSync(path.join(dir, jsFile), 'utf8');

if (content.includes('AIzaSy')) {
    console.log('FOUND KEY');
} else {
    console.log('KEY MISSING');
}

const match = content.match(/apiKey:"(.*?)"/);
if (match) {
    console.log('apiKey found in code:', match[0]);
} else {
    // try different quoting or property name
    const match2 = content.match(/apiKey:'(.*?)'/);
    if (match2) console.log('apiKey found in code (single quote):', match2[0]);
    else console.log('apiKey pattern not found');
}
