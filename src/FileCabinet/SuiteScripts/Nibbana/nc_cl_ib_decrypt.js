/**
 * @NApiVersion 2.1
 */
define(['N/https', 'N/record'],

    (https, record) => {
        
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

        async function decryptData() {
            var rec = record.load({
                type:'customrecord_nc_ib_productconfig',
                id: 1
            })
            
            var encrypted = rec.getValue({
                fieldId: 'custrecord_nc_ib_productkey'
            })

            var suiteletURL = 'https://' + window.location.hostname + '/app/site/hosting/scriptlet.nl?script=customscript_nc_su_ib_decrypt_pkey&deploy=customdeploy_nc_su_ib_decrypt_pkey';
            var response = https.get({ url: suiteletURL });
            console.log(response.body);

            var data = JSON.parse(response.body);
            var privateKeyField;
            privateKeyField = data.privateKeyField;

            var decryptionDate = await decryptDate(encrypted, privateKeyField)

            if (decryptionDate){
                var suiteletURL = 'https://' + window.location.hostname + '/app/site/hosting/scriptlet.nl?script=customscript_nc_su_ib_decrypt_pkey&deploy=customdeploy_nc_su_ib_decrypt_pkey';
                var response = https.post({
                    url: suiteletURL,
                    body: decryptionDate
                });

                if (response.body) {
                    window.location.reload();
                }
            }

        }
        
        return { decryptData }

    });
