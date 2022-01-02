import { displayCustomizationDialogue } from "./customization";
import { getOrCreateFoundryId, getUser, isGm } from "./foundryUtils";
import { debugLog, displayErrorMessageToUser, displayInfoMessageToUser } from "./logging";
import { checkCustomAddress, customizeRedirectAddress, getRedirectAddress, postFoundryInfo } from "./server";

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
  
Hooks.on("ready", function() {
    if(!isGm()){
        console.log("Foundry Redirect: Current user is not the GM. Not setting up foundry redirects");
        return;
    }
    // post server IP to the redirect server
    refreshIpData()
});

Hooks.on("renderInvitationLinks", (links:InvitationLinks, html:JQuery) => {  
    return getRedirectAddress().then(async address =>{
        debugLog("Inserting redirect address into invitation links")
        if(!address){
            return;
        }
        const invitationPosition = links.position;
        invitationPosition.height = 235;
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
        const foundryDivId = "foundry-redirect-data"
        divToInsert.id = foundryDivId
        let htmlToInsert =  await renderTemplate("modules/foundry-redirect/templates/invitationInsertion.html", {
            ...address,
            isGm : isGm(),
        });
        divToInsert.innerHTML = htmlToInsert;
        
        formHtml.prepend(divToInsert)
        formHtml.prepend(initialNotes)

        let customizeRedirectLink = formHtml.querySelector("#customize-redirect-link")
        if(customizeRedirectLink && customizeRedirectLink instanceof HTMLAnchorElement){
            customizeRedirectLink.onclick = () => {
                displayCustomizationDialogue(() => {
                    links.render()
                })
            }
        } else {
            debugLog("Could not locate customize redirect link in invitations window")
        }

        // we need to re-activate the listeners to ensure that the copy functionality works on our new links
        links.activateListeners(html.find(divToInsert));
    });
});
