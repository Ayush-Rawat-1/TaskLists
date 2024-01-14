import LocalStrategy from "passport-local";
import { db } from "./dbConfig.mjs";
import bcrypt from "bcrypt";
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';

function initialize(passport){
    console.log("Initialized");
    
    const authenticateUser=async (email,password,done)=>{
        console.log(email , password );
        try{
            const result=await db.query("SELECT * FROM users WHERE email = $1;",[email]);
            console.log(result.rows);
            if(result.rowCount > 0){
                //email is registered in our database
                const user=result.rows[0];
                bcrypt.compare(password,user.password,(err,isMatch)=>{
                    if(isMatch){
                        //password is correct
                        return done(null,user);
                    }else{
                        //incorrect password
                        return done(null,false,{message: "Password is incorrect"});
                    }
                });
            }else{
                //email is not registered in our database
                return done(null,false,{message: "No user with that email address"});
            }
        }catch(err){
            console.log("Error authenciate User : ",err);
            return done(err);
        }
    }

    passport.use(
        new LocalStrategy(
            {usernameField: "email",passwordField: "password"},
            authenticateUser
        )
    );
    
    passport.use(new GoogleStrategy(
        {
            clientID: process.env.CLIENT_ID,
            clientSecret: process.env.CLIENT_SECRET,
            callbackURL: "https://tasklists.azurewebsites.net/auth/google/callback",
        },
        async (accessToken, refreshToken, profile, done)=> {
            try{
                const userProfile=profile._json;
                console.log(userProfile);
                const result=await db.query("SELECT * FROM users WHERE email = $1;",[userProfile.email]);
                console.log(result.rows);
                if(result.rowCount > 0){
                    //email is registered in our database
                    const user=result.rows[0];
                    return done(null,user);
                }else{
                    //email is not registered in our database
                    try{
                        const newUser=await db.query("INSERT INTO users(email,google_id) VALUES($1,$2) RETURNING *;",[userProfile.email,userProfile.sub]);
                        return done(null,newUser.rows[0]);
                    }
                    catch(err){
                        throw err;
                    }
                }
            }catch(err){
                console.log("Error google authenciate User : ",err);
                return done(err);
            }
        }
    ));

    passport.serializeUser((user,done)=> done(null,user));

    passport.deserializeUser(async (user,done)=>{
        try{
            const uid=user.uid;
            const result=await db.query("SELECT * FROM users WHERE uid = $1;",[uid]);
            if(result.rowCount > 0){
                return done(null,result.rows[0]);
            }else{
                console.log("Wrong session id");
                return done(null,false,{message: "Failed to deserialize"});
            }
        }catch(err){
            console.log("Error deserialize user : ",err);
            return done(err);
        }
    });
}
export { initialize };