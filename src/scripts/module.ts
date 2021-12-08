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
    refreshIpData()
});

Hooks.on("renderInvitationLinks", (links:InvitationLinks, html:JQuery) => {
    return getRedirectAddress().then(address =>{
        if(!address){
            return;
        }

        const invitationPosition = links.position;
        invitationPosition.height = 200;
        links.setPosition(invitationPosition)

        // find then window content
        const windowContent = html.get(0);
        if(!windowContent){
            console.error("Foundry redirect: Invitation links page does not match expected layout")
            return;
        }
        const formHtml = windowContent.lastElementChild?.lastElementChild;
        if(!formHtml || formHtml.childElementCount != 3){
            console.error("Foundry redirect: Invitation links page does not match expected layout")
            return;
        }
        // formHtml should be a <form> containing notes about how invitation links work, and 2 inputs for the local and internet links
        const localNetworkDiv = formHtml.children.item(1);
        const internetDiv = formHtml.children.item(2);
        if(!(localNetworkDiv && localNetworkDiv.classList.contains("form-group") && internetDiv && internetDiv.classList.contains("form-group"))){
            console.error("Foundry redirect: Invitation links page does not match expected layout")
            return;
        };
        
        // create copies of the link nodes, but switch out the native IP address with the foundry redirect
        const redirectLocal = localNetworkDiv.cloneNode(true);
        const redirectInternet = internetDiv.cloneNode(true);

        let foundLocalInput = false;
        let foundInternetInput = false;
        redirectLocal.childNodes.forEach(child=>{
            if(child instanceof HTMLInputElement){
                child.value = address.localAddress;
                foundLocalInput = true;
            }
        });

        redirectInternet.childNodes.forEach(child=>{
            if(child instanceof HTMLInputElement){
                child.value = address.externalAddress;
                foundInternetInput = true;
            }
        });

        // sanity check that we found content to replace before we start changing the DOM
        if(!(foundLocalInput && foundInternetInput)){ 
            console.error("Foundry redirect: Invitation links page does not match expected layout")
            return;
        }

        formHtml.removeChild(localNetworkDiv)
        formHtml.removeChild(internetDiv);

        formHtml.appendChild(redirectLocal);
        formHtml.appendChild(redirectInternet);

        // add the native links below, with a description of what the module has done
        const redirectDescNode : HTMLParagraphElement = document.createElement("p");
        redirectDescNode.textContent = "The above links are generated by the Foundry Redirect module. They should remain constant if your IP address changes. To use native FoundryVTT invitation links, see below."
        redirectDescNode.classList.add("notes")
        formHtml.appendChild(redirectDescNode);
        formHtml.appendChild(document.createElement("hr"))
        formHtml.appendChild(localNetworkDiv);
        formHtml.appendChild(internetDiv)

        // we need to re-activate the listeners to ensure that the copy functionality works on our new links
        links.activateListeners(html);
    });
})