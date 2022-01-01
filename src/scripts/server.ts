import { getOrCreateFoundryId } from "./foundryUtils";
import { debugLog, displayErrorMessageToUser } from "./logging";


const TEST_SERVER_BASE_URL = "https://9fq01qzza7.execute-api.us-west-2.amazonaws.com/test"
export const DEFAULT_SERVER_BASE_URL = "https://foundryredirect.com"
const SERVER_BASE_URL = TEST_SERVER_BASE_URL; //TODO change
const CUSTOMIZE_SERVER_URL = `${SERVER_BASE_URL}/api/customize`
const FOUNDRY_ID_URL_PARAM = "foundry_id";
const EXTERNAL_ADDRESS_URL_PARAM = "external_address";
const INTERNAL_ADDRESS_URL_PARAM = "internal_address";
const PUBLIC_ID_URL_PARAM = "public_id";

export interface RedirectAddresses {
    externalAddress : string,
    localAddress : string
}

export interface CustomAddressStatus {
    isAvailable: boolean,
    message: string
}

export interface CustomizeAddressResponse {
    success: boolean,
    message: string
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

export async function checkCustomAddress(address:string): Promise<CustomAddressStatus> {

    const isAlphanumeric = address.match(/[0-9A-Za-z_\-]+/)
    if(!isAlphanumeric){
        return {
            isAvailable :false,
            message: "Custom address must contain only letters, numbers, hyphens, and underscores",
        }
    }
    try{
        let response = await fetch(`${CUSTOMIZE_SERVER_URL}?${PUBLIC_ID_URL_PARAM}=${address}`);
        let isAvailable = response.status === 200
        let responseBody = await response.text();
        return {
            isAvailable: isAvailable,
            message: responseBody
        }
    } catch(err){
        console.error(err);
        return {
            isAvailable: false,
            message: "Could not check if address is available"
        }
    }
}

export async function customizeRedirectAddress(newAddress: string) : Promise<CustomizeAddressResponse> {
    const foundryId = getOrCreateFoundryId();
    try {
        let response = await fetch(`${CUSTOMIZE_SERVER_URL}?${FOUNDRY_ID_URL_PARAM}=${foundryId}&${PUBLIC_ID_URL_PARAM}=${newAddress}`,{
            method : "POST"
        })
        let success = response.status === 200
        let responseBody = await response.text();
        return {
            success: success,
            message: responseBody
        }
    } catch(err) {
        console.error(err);
        return {
            success : false,
            message: "Error connecting to server to change redirect address"
        }
    }
}
