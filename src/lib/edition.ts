import { getChEditionFromEnv, type ChEdition } from "@agent-control-hub/config";





export type Edition = ChEdition;





/**


 * Server-side edition (Hermes OSS Simple vs commercial).


 * Reads `CH_EDITION` / `NEXT_PUBLIC_CH_EDITION` with legacy `CH_*` fallback (see `@agent-control-hub/config`).


 */


export function getEdition(): Edition {


  return getChEditionFromEnv();


}





export function isCommercialEdition(): boolean {


  return getEdition() === "commercial";


}


