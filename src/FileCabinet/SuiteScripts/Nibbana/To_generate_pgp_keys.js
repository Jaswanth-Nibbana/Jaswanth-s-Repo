const openpgp = require('openpgp');

async function generatePGPKeys() {
    const { privateKey, publicKey, revocationCertificate } = await openpgp.generateKey({
        type: 'rsa', // Type of the key (rsa or ecc)
        rsaBits: 2048, // Key size (for RSA only)
        userIDs: [{ name: 'Jaswanth', email: 'jvardireddy@nibbanaconsulting.com' }],
        keyExpirationTime: 4*365 * 24 * 60 * 60 // Key expiration time in seconds (2 year)
    });

    console.log('Private Key:', privateKey); // Exported as a string
    console.log('Public Key:', publicKey); // Exported as a string
    console.log('Revocation Certificate:', revocationCertificate); // Exported as a string

    // Optionally, save the keys to files
    saveToFile('public_key.asc', publicKey);
    saveToFile('private_key.asc', privateKey);
}

// Helper function to save keys to files
const fs = require('fs');
function saveToFile(filename, data) {
    fs.writeFileSync(filename, data, 'utf8');
}

// Generate the keys
generatePGPKeys().catch(console.error);
