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
    debugLog("Foundry Redirect: Refreshing foundry link data");
    let invitationLinks = new InvitationLinks()
    let invitationData = await invitationLinks.getData();
    debugLog(invitationData);
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
    debugLog("Foundry Redirect Id: " + foundryId)
    return <string>foundryId;
}


async function postFoundryInfo(foundryId : string, externalAddress:string, localAddress: string) : Promise<void> {
    return fetch(`${SERVER_BASE_URL}?${FOUNDRY_ID_URL_PARAM}=${foundryId}&${EXTERNAL_ADDRESS_URL_PARAM}=${externalAddress}&${INTERNAL_ADDRESS_URL_PARAM}=${localAddress}`, {
        method: "POST"
    }).then(res=>{
        debugLog("Foundry redirect: Successfully updated server address on server")
    }).catch(err=>{
        displayErrorMessageToUser("Failed to post server address to redirect server")
        console.error(err);
    })
}

async function getRedirectAddress() : Promise<RedirectAddresses|undefined> { 
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

function debugLog(msg:any) {
    if( CONFIG.debug.hasOwnProperty("redirect") && CONFIG.debug["redirect"]){
        console.log(msg);
    }
}
  
Hooks.on("ready", function() {
    let user = getUser();
    if(!user || !user.isGM){
        console.log("Foundry Redirect: Current user is not the GM. Not setting up foundry redirects");
        return;
    }

    // post server IP to the redirect server
    refreshIpData()
});

Hooks.on("renderInvitationLinks", (links:InvitationLinks, html:JQuery) => {  
    return getRedirectAddress().then(address =>{
        debugLog("Inserting redirect address into invitation links")
        if(!address){
            return;
        }

        const invitationPosition = links.position;
        invitationPosition.height = 200;
        links.setPosition(invitationPosition)

        // find then window content
        const windowContent = html.get(0);
        if(!windowContent){
            debugLog("Could not get base window content")
            console.error("Foundry redirect: Invitation links page does not match expected layout")
            return;
        }

        // When the window is opened from closed, the content of the Jquery argument
        // is the whole window
        // If the window was reloaded, the JQuery is the Form
        let formHtml : HTMLFormElement | undefined;
        if(windowContent.classList.contains("window-app") && windowContent instanceof HTMLDivElement){
            let potentialForm = windowContent.lastElementChild?.lastElementChild;
            if(potentialForm instanceof HTMLFormElement){
                formHtml = potentialForm;
            }
        } else if(windowContent instanceof HTMLFormElement){
            formHtml = windowContent;
        }
        if(!formHtml || formHtml.childElementCount < 3){
            debugLog("Could not locate input form in invitation window")
            debugLog(formHtml)
            debugLog(windowContent.lastElementChild)
            console.error("Foundry redirect: Invitation links page does not match expected layout")
            return;
        }

        const initialNotes = formHtml.children.item(0);
        if(!initialNotes || !(initialNotes instanceof HTMLParagraphElement)) {
            debugLog("Initial form element was not the expected paragraph")
            debugLog(initialNotes)
            return;
        }

        const divToInsert = document.createElement("div")
        divToInsert.innerHTML = `
            <div class="form-group">
                <label for="local"><i class="fas fa-ethernet"></i> Local Network</label>
                <input type="text" class="invite-link" name="local" value="${address.localAddress}">
            </div>
            <div class="form-group">
                <label for="remote" title=""><i class="fas fa-wifi"></i> Internet</label>
                <input type="text" class="invite-link" name="remote" value="${address.externalAddress}">
            </div>
            <p class="notes">
                The above links are generated by the Foundry Redirect module. They should remain constant if your IP address changes. To use native FoundryVTT invitation links, see below.
            </p>
            <hr>
        `

        formHtml.prepend(divToInsert)
        formHtml.prepend(initialNotes)

        // we need to re-activate the listeners to ensure that the copy functionality works on our new links
        links.activateListeners(html);
    });
})