import { getOrCreateFoundryId } from "./foundryUtils";
import { debugLog, displayErrorMessageToUser } from "./logging";

const SERVER_BASE_URL = "https://foundryredirect.com"
const FOUNDRY_ID_URL_PARAM = "foundry_id";
const EXTERNAL_ADDRESS_URL_PARAM = "external_address";
const INTERNAL_ADDRESS_URL_PARAM = "internal_address";

interface RedirectAddresses {
    externalAddress : string,
    localAddress : string
}

export async function postFoundryInfo(foundryId : string, externalAddress:string, localAddress: string) : Promise<void> {
    return fetch(`${SERVER_BASE_URL}?${FOUNDRY_ID_URL_PARAM}=${foundryId}&${EXTERNAL_ADDRESS_URL_PARAM}=${externalAddress}&${INTERNAL_ADDRESS_URL_PARAM}=${localAddress}`, {
        method: "POST"
    }).then(res=>{
        debugLog("Foundry redirect: Successfully updated server address on server")
    }).catch(err=>{
        displayErrorMessageToUser("Failed to post server address to redirect server")
        console.error(err);
    })
}

export async function getRedirectAddress() : Promise<RedirectAddresses|undefined> { 
    const foundryId = getOrCreateFoundryId();
    return fetch(`${SERVER_BASE_URL}?${FOUNDRY_ID_URL_PARAM}=${foundryId}`).then(async res =>{
        let responseText  = await res.text();
        debugLog("Fetch redirect address response: " + responseText);
        let redirect : RedirectAddresses = {
            externalAddress: responseText,
            localAddress : responseText + "/local"
        }
        return redirect;
    }).catch(err=>{
        displayErrorMessageToUser("Failed to fetch foundry redirect address from server")
        console.error(err)
        return undefined;
    });
}