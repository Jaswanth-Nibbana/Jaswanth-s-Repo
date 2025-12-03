const openpgp = require('openpgp');

// Function to encrypt the date
async function encryptDate(date, publicKeyArmored) {
    const publicKey = await openpgp.readKey({ armoredKey: publicKeyArmored });

    const encrypted = await openpgp.encrypt({
        message: await openpgp.createMessage({ text: date }), // Input as Message object
        encryptionKeys: publicKey
    });

    return encrypted; // The encrypted date string
}

// Function to decrypt the date
async function decryptDate(encryptedMessage, privateKeyArmored) {
    // Read the private key (no passphrase)
    const privateKey = await openpgp.readPrivateKey({ armoredKey: privateKeyArmored });

    // Read the encrypted message
    const message = await openpgp.readMessage({ armoredMessage: encryptedMessage });

    // Decrypt the message using the private key
    const { data: decrypted } = await openpgp.decrypt({
        message,
        decryptionKeys: privateKey
    });

    return decrypted; // Return the decrypted string
}

// Example usage
const publicKeyArmored = `-----BEGIN PGP PUBLIC KEY BLOCK-----

xsBNBGZQWbQBCADDp0jQs+3amvucpeiW0OVg6EmZlUROJHVVz4nRmZMvXFbl
38wf9UqVtnZxHn0LgFuSs7jun/TbSoe/EEfkLudkv+C5UJaeV1Kle75tf/tI
NaZMvx4BPYMrdyozFjyFM/KKBvYDZFUs+flpAtM5cXTHUC8iFDre45EJR5GA
Lr1LczTsVbUQkF33Yvpfjb8FNJimScXEEo+u6htSF3xESKqNM1EvCZXqc2qR
ENyaZ3omGE2ncNCCsufJ2XHbu/fBSuLlDKklaahmIpOfOzuPf/EzlODxKv9j
4l2WxeA7L3ME8SvwCyTcvGCR42n8430Es+p+HB45CYQ4Ig1YkdoYWvPHABEB
AAHNLEphc3dhbnRoIDxqdmFyZGlyZWRkeUBuaWJiYW5hY29uc3VsdGluZy5j
b20+wsCQBBABCABEBYJmUFm0BYkHhM4ABAsJBwgJkO+wERkbc1HuAxUICgQW
AAIBAhkBApsDAh4BFiEECGVRqm+EuRzDkeKg77ARGRtzUe4AABCWCACDhHyG
EIzJlh/xgmRjL8oyFG5ZcLJl4wsEnAqQjQA3vzrsu6bbT3RWmqXVwDZUalx/
lhaB81y9K9MZbRuG8gp8+8Uf7G565pHb2AJPI1CGSCwROsR/rIjGcL+J1bI6
abIGK57Ot1VoRWUbisB2JOtfp3HDz/OpmMgWeLbb53A7avjiafK7bgw2Iu5t
3/gnnywEUO4HmGZqqV61gSVAOQrx5/b9j8O45McPgzQDcVTI3uLGSbykC93j
mLaMPLjXl1MQhsmjIWD+GnPRyMDyLHUwt64nQqADMi5vMpIYhY4d9DUb3LHH
sf9khgpg/XCiCkJ0AkH5S0CWkG1/BIL0p406zsBNBGZQWbQBCAC5iRo4NOCk
rHB5AYHo+qiNDbtvbh7ORGOfT4ofb+GunujLEB4jSor22d4Os7v/zzWG8Eha
SQSUcQmP7UwmqfvmKFSPpSC9nhYnYF1xclCpldR7gRxgM7bhAFb94WHcIa/f
cX4YF1lMnRiFFTHurzuIHvEslwx9RNzKsBxyaGmfeLhxNLgWnfnXBTnljWKZ
bvd1h0ZOLJi3EYom+7KEo/BZq9m+wBXd0uqYDdiZg9WO8AwlCQc7gryerznA
5L/Px0Lsix2UyIBjFXuICeeT4+mzJTt/DH56zS6ZZyTrHQtTzs2+e7mz4O5V
LrJjMOvZrc8Uh2Z9yhLJ/5pN1iJtCqnZABEBAAHCwHwEGAEIADAFgmZQWbQF
iQeEzgAJkO+wERkbc1HuApsMFiEECGVRqm+EuRzDkeKg77ARGRtzUe4AAFEW
CACP5DUscrcOulv5tMMnuu8XIcJglZ2bcfkIzvbVryCCox2QHNL2qJNJPY7D
B79ag9HbNWDasr0QWZIaUw0ZtTzi5aMY3AVhIf7xgq8ad3gVjNR1uXE91l4f
OlBTAGZC++SmveXFBszqnNMjK/2GM+yhL85h+W/6BnrkSZRTScx33M0Edep0
2IeeUlM2fXybNAY7hySqIFosZyVncVpuyPSAeIMpcN4ql+3fSixlue8NQF41
p7KRqS64X3q+IayL0z88cwtSMHhcQ9fKORTQZahiExm8srJduz6FkiT7CLot
3I/rvO68n1lmlX6hjwYnhaJtknu0494KqihiE2ZH9rrR
=Q319
-----END PGP PUBLIC KEY BLOCK-----`;

const privateKeyArmored = `-----BEGIN PGP PRIVATE KEY BLOCK-----

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
=sY/D
-----END PGP PRIVATE KEY BLOCK-----`;

const passphrase = 'Nibbana Consulting';
const date = '05/30/2025'; //MM/DD/YYY

encryptDate(date, publicKeyArmored).then(encrypted => {
    console.log("Encrypted Date:", encrypted);

    decryptDate(encrypted, privateKeyArmored).then(decryptedDate => {
        console.log("Decrypted Date:", decryptedDate);
    });
});
