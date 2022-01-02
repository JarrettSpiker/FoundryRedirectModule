import { debugLog, displayErrorMessageToUser, displayInfoMessageToUser } from "./logging";
import { checkCustomAddress, CustomAddressStatus, customizeRedirectAddress, DEFAULT_SERVER_BASE_URL, getRedirectAddress } from "./server";

export async function displayCustomizationDialogue(callback : ()=>void) {
    let content = await renderTemplate("modules/foundry-redirect/templates/customizationDialogue.html", {})
    let dialogue = new Dialog({
        title: "Foundry Redirect Customization",
        buttons: {},
        render: (html) => {onRender(html, dialogue)},
        content : content,
        default : "cancel",
        close: () => callback(),
    },
    {
        width: 575
    });
    dialogue.render(true);
}

async function submitChanges(target:GlobalEventHandlers, event:MouseEvent, dialogue:Dialog){
    event.preventDefault();
    let formElement = findCustomizationFormFromClickTarget(target);
    if(!formElement) {
        return;
    }
    let inputElement = findInputElement(formElement);
    if(!inputElement) {
        return;
    }
    let newAddress = inputElement.value;
    let response = await customizeRedirectAddress(newAddress);
    if(response.success){
        displayInfoMessageToUser("Successfully updated invitation links");
    } else {
        displayErrorMessageToUser(response.message);
    }
    dialogue.close();
}

function cancel(dialogue:Dialog, ev: MouseEvent) {
    ev.preventDefault();
    dialogue.close();
}

async function testAddress(this: GlobalEventHandlers, ev: MouseEvent){
    ev.preventDefault();
    let formElement = findCustomizationFormFromClickTarget(this);
    if(!formElement) {
        return;
    }
    let statusMessage = findStatusMessage(formElement);
    if(!statusMessage) {
        return;
    }
    let inputElement = findInputElement(formElement);
    if(!inputElement){
        return;
    }
    setLoadingState(formElement);
    let customAddress = inputElement.value;
    let available = await checkCustomAddress(customAddress);
    setAddressAvailableStatus(formElement, available)
}

async function onRender(html: HTMLElement | JQuery<HTMLElement>, dialogue:Dialog){

    // find current redirect address and load data into dialogue
    let currentAddress = await getRedirectAddress();
    if(!currentAddress){
        displayErrorMessageToUser("Failed to find redirect address when loading customization dialogue")
        return;
    }
    if(!currentAddress.externalAddress.startsWith(DEFAULT_SERVER_BASE_URL)){
        displayInfoMessageToUser("Server address has unexpected prefix " + currentAddress)
        return;
    }
    
    let publicId = currentAddress.externalAddress.substring(DEFAULT_SERVER_BASE_URL.length + 1);
    
    let redirectElement = findInputElement(html);
    let testButton = findTestAddressButton(html);

    let submitButton = findSubmitButton(html);
    let cancelButton = findCancelButton(html);

    if(!redirectElement || !testButton || !cancelButton || !submitButton){
        displayErrorMessageToUser("Error rendering Foundry Redirect Customization")
        return;
    }
    redirectElement.value = publicId;

    // add listeners to the various buttons
    testButton.onclick = testAddress;
    submitButton.onclick = (ev) => submitChanges(submitButton!, ev, dialogue);
    cancelButton.onclick = (ev) => cancel(dialogue, ev);

    // allow address to be edited, and test to be clicked
    hideStatusMessageSection(html, true);
    testButton.disabled = false;
    redirectElement.disabled = false;
}

function hideStatusMessageSection(html: HTMLElement | JQuery<HTMLElement>, hide :boolean) {
    let statusMessageIcon = findStatusMessageIcon(html);
    if(statusMessageIcon){
        statusMessageIcon.style.visibility = hide ? "hidden" : "visible";
    }
    let statusMessage = findStatusMessage(html);
    if (statusMessage){
        statusMessage.style.visibility = hide ? "hidden" : "visible";
    }
}

function findStatusMessage(html: HTMLElement | JQuery<HTMLElement>) : HTMLElement | undefined {
    let statusMessage = findElementById(html, "redirect-status-message");
    if(!statusMessage || !(statusMessage instanceof HTMLElement)){
        debugLog("Redirect status message element could not be found")
        debugLog(statusMessage)
        return;
    }
    return statusMessage;
}

function findStatusMessageIcon(html: HTMLElement | JQuery<HTMLElement>) : HTMLElement | undefined {
    let statusIcon = findElementById(html, "redirect-status-icon");
    if(!statusIcon || !(statusIcon instanceof HTMLElement)){
        debugLog("Redirect status message element could not be found")
        debugLog(statusIcon)
        return;
    }
    return statusIcon;
}

function findTestAddressButton(html: HTMLElement | JQuery<HTMLElement>) : HTMLButtonElement | undefined {
    let testButton = findElementById(html, "test-redirect-address");
    if(!testButton || !(testButton instanceof HTMLButtonElement)){
        debugLog("Test Redirect element could not be found")
        debugLog(testButton)
        return;
    }
    return testButton
}

function findInputElement(html: HTMLElement | JQuery<HTMLElement>) : HTMLInputElement | undefined {
    let redirectElement = findElementById(html, "redirect-value")
    if(!redirectElement || !(redirectElement instanceof HTMLInputElement)){
        debugLog("Redirect value element could not be found")
        debugLog(redirectElement)
        return;
    }
    return redirectElement;
}

function findSubmitButton(html: HTMLElement | JQuery<HTMLElement>) : HTMLButtonElement | undefined {
    let button = findElementById(html, "submit-redirect");
    if(!button || !(button instanceof HTMLButtonElement)){
        debugLog("Submit redirect button could not be found")
        debugLog(button)
        return;
    }
    return button
}

function findCancelButton(html: HTMLElement | JQuery<HTMLElement>) : HTMLButtonElement | undefined {
    let button = findElementById(html, "cancel-redirect");
    if(!button || !(button instanceof HTMLButtonElement)){
        debugLog("Cancel redirect button could not be found")
        debugLog(button)
        return;
    }
    return button
}

function setLoadingState(form:HTMLElement){
    let statusMessage = findStatusMessage(form);
    if(!statusMessage) {
        return;
    }
    let statusIcon = findStatusMessageIcon(form);
    if(!statusIcon) {
        return;
    }
    let testAddressButton = findTestAddressButton(form);
    if(!testAddressButton){
        return;
    }
    statusMessage.textContent= "Loading..."
    let classesToRemove : string[] = []
    statusIcon.classList.forEach(c =>{
        if(c.startsWith("fa-")){
            classesToRemove.push(c)
        }
    })
    classesToRemove.forEach(c=>{
        statusIcon?.classList.remove(c)
    })
    statusIcon.classList.add("fa-spin")
    statusIcon.classList.add("fa-spinner")
    statusIcon.style.color = "";

    testAddressButton.disabled = true;
    hideStatusMessageSection(form, false)
}

function setAddressAvailableStatus(form:HTMLElement, available:CustomAddressStatus) {
    let statusMessage = findStatusMessage(form);
    if(!statusMessage) {
        return;
    }
    let statusIcon = findStatusMessageIcon(form);
    if(!statusIcon) {
        return;
    }
    let testAddressButton = findTestAddressButton(form);
    if(!testAddressButton){
        return;
    }
    let submitButton = findSubmitButton(form);
    if(!submitButton){
        return;
    }

    let message = available.message;
    if(message.startsWith('"')){
        message = message.substring(1)
    }
    if(message.endsWith('"')){
        message = message.substring(0, message.length-1)
    }
    statusMessage.textContent = message;
    let classesToRemove : string[] = []
    statusIcon.classList.forEach(c =>{
        if(c.startsWith("fa-")){
            classesToRemove.push(c)
        }
    })
    classesToRemove.forEach(c=>{
        statusIcon?.classList.remove(c)
    })
    statusIcon.classList.add(available.isAvailable ? "fa-check" : "fa-times-circle")
    statusIcon.style.color = available.isAvailable ? "#006400" : "#8B0000";
    testAddressButton.disabled = false;
    hideStatusMessageSection(form, false)
    submitButton.disabled = !available.isAvailable;
}

function findElementById(html: HTMLElement | JQuery<HTMLElement>, id:string) {
    if(html instanceof HTMLElement) {
        return html.querySelector(`#${id}`)
    } else {
        let q = html.find(`#${id}`)
        if(q.length < 1) {
            return null
        }
        return q.get()[0]
    }
}

// recurses from the target of an onclick event, to the top level
// form defined for this dialog based on its ID
function findCustomizationFormFromClickTarget(target:GlobalEventHandlers) : HTMLElement | undefined {
    
    if(!(target instanceof HTMLElement)){
        debugLog("Target of click was not an HTMLElement")
        debugLog(target)
        return;
    }
    let formElement : HTMLElement | null = target;
    while(formElement && formElement.id !== "redirect-customization-form") {
        formElement = formElement.parentElement;
    }
    if(!formElement){
        debugLog("Could not locate customization form from onclick action handler")
        return;
    }
    return formElement
}
