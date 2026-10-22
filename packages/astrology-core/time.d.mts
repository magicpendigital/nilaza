import type {BirthInput,CandidateChart} from "./calculator.mjs";
export class BirthInputError extends Error {code:string;details:{candidates?:{utc:string;offset:string}[]};}
export function resolveBirthInput(input:BirthInput):CandidateChart["time"];
