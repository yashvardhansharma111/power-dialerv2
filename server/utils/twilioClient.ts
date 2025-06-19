import twilio, { twiml as Twiml } from "twilio";
import dotenv from "dotenv";
dotenv.config(); // Add this line at the top


const client = twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);
console.log("TWILIO_ACCOUNT_SID:", process.env.TWILIO_ACCOUNT_SID);
console.log("TWILIO_AUTH_TOKEN:", process.env.TWILIO_AUTH_TOKEN);


export default client;
export const twiml = Twiml;
