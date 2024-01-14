import dotenv from "dotenv";
dotenv.config();
import pg from "pg";

var conString = process.env.DB_URL; //Can be found in the Details page
var db = new pg.Client(conString);

db.connect();

export { db };