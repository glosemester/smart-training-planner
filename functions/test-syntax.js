try {
    const index = require('./index.js');
    console.log('Syntax OK');
    process.exit(0);
} catch (error) {
    console.error('Syntax Error:', error);
    process.exit(1);
}
