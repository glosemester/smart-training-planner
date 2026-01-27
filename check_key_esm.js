import fs from 'fs';
import path from 'path';

const dir = 'dist/assets';
try {
    const files = fs.readdirSync(dir);
    const jsFile = files.find(f => f.startsWith('index-') && f.endsWith('.js'));

    if (!jsFile) {
        console.log('No index js file found');
        process.exit(1);
    }
    console.log('Found JS file:', jsFile);
    const content = fs.readFileSync(path.join(dir, jsFile), 'utf8');
    console.log('File size:', content.length);
    console.log('Content snippet:', content.substring(0, 500));

    if (content.includes('AIzaSy')) {
        console.log('FOUND KEY');
    } else {
        console.log('KEY MISSING');
    }
} catch (e) {
    console.error(e);
}
