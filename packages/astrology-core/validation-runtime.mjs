// Pure ES module helpers for the compiled JSON schema; no eval/Node runtime needed on Hermes.
export const unicodeLength = value => Array.from(value).length;
export function structuralEqual(a,b) {
 if(a===b)return true;
 if(!a||!b||typeof a!=="object"||typeof b!=="object"||Array.isArray(a)!==Array.isArray(b))return false;
 const keys=Object.keys(a);
 return keys.length===Object.keys(b).length&&keys.every(k=>Object.prototype.hasOwnProperty.call(b,k)&&structuralEqual(a[k],b[k]));
}
