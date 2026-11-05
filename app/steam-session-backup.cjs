'use strict';
// Only the two fields needed for Steam logOn are portable; never export cookies or guard secrets.
function clean(value){if(!value||!/^\d{17}$/.test(String(value.userId||''))||typeof value.refreshToken!=='string'||value.refreshToken.length<20||value.refreshToken.length>16384)throw Error('Collega prima Steam con il QR di Steam Guard.');return {userId:String(value.userId),refreshToken:value.refreshToken};}
module.exports={clean};
