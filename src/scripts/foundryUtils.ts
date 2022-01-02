import * as uuid from "uuid";
import { debugLog } from "./logging";

const FOUNDRY_ID_FLAG = "foundry_redirect_id"

export function getUser() : StoredDocument<User> | null {
    let g = <Game>game
    return g.user;
}

export function isGm() : boolean {
    let user = getUser();
    if(!user){
        return false;
    }
    return user.isGM;
}

export function getOrCreateFoundryId() : string {
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