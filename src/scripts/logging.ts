export function displayInfoMessageToUser(message:string) {
    message = "Foundry Redirect: " + message;
    ui.notifications?.info(message);
    console.log(message);
}

export function displayErrorMessageToUser(error:string) {
    error = "Foundry Redirect: " + error
    ui.notifications?.error(error);
    console.error(error);
}

export function debugLog(msg:any) {
    if( CONFIG.debug.hasOwnProperty("redirect") && CONFIG.debug["redirect"]){
        console.log(msg);
    }
}