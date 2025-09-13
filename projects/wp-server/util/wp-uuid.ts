import { v4 as uuidv4 } from 'uuid';
export const wpUid = () =>{
    let tokens = uuidv4().split('-');
    return tokens[2] + tokens[1] + tokens[0] + tokens[3] + tokens[4];
}