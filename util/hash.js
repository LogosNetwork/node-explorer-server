const blake = require('blakejs');
const STATE_BLOCK_PREAMBLE = '0000000000000000000000000000000000000000000000000000000000000006';

uint8_hex = (uint8) => {
    let hex = "";
    let aux;
    for (let i = 0; i < uint8.length; i++) {
        aux = uint8[i].toString(16).toUpperCase();
        if (aux.length == 1)
        aux = '0' + aux;
        hex += aux;
        aux = '';
    }
    return (hex);
}

hex_uint8 = (hex) => {
    let length = (hex.length / 2) | 0;
    let uint8 = new Uint8Array(length);
    for (let i = 0; i < length; i++) uint8[i] = parseInt(hex.substr(i * 2, 2), 16);
    return uint8;
}


equal_arrays = (array1, array2) => {
    for (let i = 0; i < array1.length; i++) {
        if (array1[i] != array2[i])  return false;
    }
    return true;
}
keyFromAccount = (account) =>  {
    if (((account.startsWith('xrb_1') || account.startsWith('xrb_3') || account.startsWith('lgs_1') || account.startsWith('lgs_3')) && (account.length == 64))) {
        let account_crop = account.replace('xrb_', '').replace('lgs_', '');
        let isValid = /^[13456789abcdefghijkmnopqrstuwxyz]+$/.test(account_crop);
        if (isValid) {
        let key_bytes = nanoBase32.decode(account_crop.substring(0, 52));
        let hash_bytes = nanoBase32.decode(account_crop.substring(52, 60));
        let blake_hash = blake.blake2b(key_bytes, null, 5).reverse();
        if (equal_arrays(hash_bytes, blake_hash)) {
            let key = uint8_hex(key_bytes).toUpperCase();
            return key;
        }
        else
            throw "Checksum incorrect.";
        }
        else
        throw "Invalid Logos account.";
    }
    throw "Invalid Logos account.";
}

get = (block) => {
    let context = blake.blake2bInit(32, null);
    blake.blake2bUpdate(context, hex_uint8(STATE_BLOCK_PREAMBLE));
    blake.blake2bUpdate(context, hex_uint8(keyFromAccount(block.account)));
    blake.blake2bUpdate(context, hex_uint8(block.previous));
    blake.blake2bUpdate(context, hex_uint8(block.representative));
    blake.blake2bUpdate(context, hex_uint8(block.amount));
    blake.blake2bUpdate(context, hex_uint8(block.link));
    return uint8_hex(blake.blake2bFinal(context));
}
module.exports = {get};
