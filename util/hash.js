const blake = require('blakejs')
const nanoBase32 = require('nano-base32')
const STATE_BLOCK_PREAMBLE = '0000000000000000000000000000000000000000000000000000000000000006'

uint8_hex = (uint8) => {
    let hex = ""
    let aux
    for (let i = 0; i < uint8.length; i++) {
        aux = uint8[i].toString(16).toUpperCase()
        if (aux.length == 1)
            aux = '0' + aux;
        hex += aux
        aux = ''
    }
    return hex
}

hex_uint8 = (hex) => {
    let length = (hex.length / 2) | 0
    let uint8 = new Uint8Array(length)
    for (let i = 0; i < length; i++) uint8[i] = parseInt(hex.substr(i * 2, 2), 16);
    return uint8
}


equal_arrays = (array1, array2) => {
    for (let i = 0; i < array1.length; i++) {
        if (array1[i] != array2[i]) return false
    }
    return true
}
keyFromAccount = (account) => {
    if (((account.startsWith('xrb_1') || account.startsWith('xrb_3') || account.startsWith('lgs_1') || account.startsWith('lgs_3')) && (account.length == 64))) {
        let account_crop = account.replace('xrb_', '').replace('lgs_', '')
        let isValid = /^[13456789abcdefghijkmnopqrstuwxyz]+$/.test(account_crop)
        if (isValid) {
            let key_bytes = nanoBase32.decode(account_crop.substring(0, 52))
            let hash_bytes = nanoBase32.decode(account_crop.substring(52, 60))
            let blake_hash = blake.blake2b(key_bytes, null, 5).reverse()
            if (equal_arrays(hash_bytes, blake_hash)) {
                let key = uint8_hex(key_bytes).toUpperCase()
                return key
            }
            else
                throw "Checksum incorrect."
        }
        else
            throw "Invalid Logos account."
    }
    throw "Invalid Logos account."
}

dec2hex = (str, bytes = null) => {
    var dec = str.toString().split(''), sum = [], hex = [], i, s
    while (dec.length) {
        s = 1 * dec.shift()
        for (i = 0; s || i < sum.length; i++) {
            s += (sum[i] || 0) * 10
            sum[i] = s % 16
            s = (s - sum[i]) / 16
        }
    }
    while (sum.length) {
        hex.push(sum.pop().toString(16))
    }

    hex = hex.join('')

    if (hex.length % 2 != 0)
        hex = "0" + hex;

    if (bytes > hex.length / 2) {
        var diff = bytes - hex.length / 2
        for (var i = 0; i < diff; i++)
            hex = "00" + hex;
    }

    return hex
}

get = (transaction) => {
    var context = blake.blake2bInit(32, null)
    blake.blake2bUpdate(context, hex_uint8(STATE_BLOCK_PREAMBLE))
    blake.blake2bUpdate(context, hex_uint8(keyFromAccount(transaction.account)))
    blake.blake2bUpdate(context, hex_uint8(transaction.previous))
    blake.blake2bUpdate(context, hex_uint8(keyFromAccount(transaction.representative)))
    blake.blake2bUpdate(context, hex_uint8(dec2hex(transaction.amount, 16)))
    blake.blake2bUpdate(context, hex_uint8(dec2hex(transaction.transaction_fee, 16)))
    blake.blake2bUpdate(context, hex_uint8(transaction.link))
    return uint8_hex(blake.blake2bFinal(context))
}
module.exports = { get }
