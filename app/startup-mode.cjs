'use strict';
const valid=value=>value==='bigscreen'||value==='desktop';
function mode(preferences={},args=[]){if(args.includes('--desktop'))return 'desktop';if(args.includes('--bigscreen'))return 'bigscreen';return valid(preferences.startupMode)?preferences.startupMode:'bigscreen';}
module.exports={valid,mode};
