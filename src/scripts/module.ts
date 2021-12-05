import * as uuid from "uuid";

const FOUNDRY_ID_FLAG = "foundry_redirect_id"

const SERVER_BASE_URL = "https://foundryredirect.com"
const FOUNDRY_ID_URL_PARAM = "foundry_id";
const EXTERNAL_ADDRESS_URL_PARAM = "external_address";
const INTERNAL_ADDRESS_URL_PARAM = "internal_address";

const PUBLIC_ID_KEY = "public_id";

interface RedirectAddresses {
    externalAddress : string,
    localAddress : string
}

async function refreshIpData() : Promise<void> {
    console.log("Foundry Redirect: Refreshing foundry link data");
    let invitationLinks = new InvitationLinks()
    let invitationData = invitationLinks.getData();
    let localAddress = invitationData.local;
    let externalAddress = invitationData.remote;

    if(!localAddress){
        displayErrorMessageToUser("Foundry Redirect: Failed to determine local IP address from Foundry")
        return;
    }
    if(!externalAddress) {
        displayErrorMessageToUser("Foundry Redirect: Failed to determine external IP address from Foundry")
        return;
    }
    
    // check if there is a stored foundry id. If not, generate one
    let foundryId = getOrCreateFoundryId();

    // submit the foundry info to AWS
    const p = postFoundryInfo(foundryId, externalAddress, localAddress);

    setTimeout(refreshIpData, 1000 * 60 * 60)
    return p;
}

function getOrCreateFoundryId() : string {
    let user = getUser();
    let foundryId = user?.getFlag("core", FOUNDRY_ID_FLAG);
    if(!foundryId){
        console.log("No foundry redirect ID found. Generating one...")
        foundryId = uuid.v1();
        user?.setFlag("core", FOUNDRY_ID_FLAG, foundryId);
    }
    return <string>foundryId;
}


async function postFoundryInfo(foundryId : string, externalAddress:string, localAddress: string) : Promise<void> {
    return fetch(`${SERVER_BASE_URL}?${FOUNDRY_ID_URL_PARAM}=${foundryId}&${EXTERNAL_ADDRESS_URL_PARAM}=${externalAddress}&${INTERNAL_ADDRESS_URL_PARAM}=${localAddress}`, {
        method: "POST"
    }).then(res=>{
        console.log("Foundry redirect: Successfully updated server address on server")
    }).catch(err=>{
        displayErrorMessageToUser("Failed to post server address to redirect server")
        console.error(err);
    })
}

async function getRedirectAddress() : Promise<RedirectAddresses|undefined> { 
    const foundryId = getOrCreateFoundryId();
    return fetch(`${SERVER_BASE_URL}?${FOUNDRY_ID_URL_PARAM}=${foundryId}`).then(async res =>{
        let responseText  = await res.text();
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

function displayInfoMessageToUser(message:string) {
    message = "Foundry Redirect: " + message;
    ui.notifications?.info(message);
    console.log(message);
}

function displayErrorMessageToUser(error:string) {
    error = "Foundry Redirect: " + error
    ui.notifications?.error(error);
    console.error(error);
}

function getUser() : StoredDocument<User> | null {
    let g = <Game>game
    return g.user;
}
 
Hooks.on("ready", function() {
    let user = getUser();
    if(!user || !user.isGM){
        console.log("Foundry Redirect: Current user is not the GM. Not setting up foundry redirects");
        return;
    }

    // post server IP to the redirect server
    refreshIpData().then(async ()=>{
        // fetch the server address from AWS to display to the user
        let redirectAddress = await getRedirectAddress();
        if(!redirectAddress){
            return;
        }
        displayInfoMessageToUser(`Redirect Address: ${redirectAddress.externalAddress}`)
    });
});

Hooks.on("renderInvitationLinks", (links:InvitationLinks, html:JQuery) => {
    return getRedirectAddress().then(address =>{
        if(!address){
            return;
        }
        let localHtmlElement = html.find("[name=local]").get(0);
        if(localHtmlElement && localHtmlElement instanceof HTMLInputElement){
            localHtmlElement.value = address.localAddress;
        }
        let externalHtmlElement = html.find("[name=remote]").get(0);
        if(externalHtmlElement && externalHtmlElement instanceof HTMLInputElement){
            externalHtmlElement.value = address.externalAddress;
        }
    });
})