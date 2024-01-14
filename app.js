import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import flash from "express-flash";
import bcrypt from "bcrypt";
import session from "express-session";
import passport from "passport";
dotenv.config();
import { db } from "./dbConfig.mjs";
import { initialize } from "./passportConfig.mjs";
import { GoogleGenerativeAI } from "@google/generative-ai";


initialize(passport);

const app=express();
const port=process.env.PORT || 3000;

app.use(express.static("public"));
app.set('view engine','ejs');
app.use(bodyParser.urlencoded({extended:true}));
app.use(bodyParser.json());
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());


//Authentication
function checkAuthenticated(req,res,next){
    if(req.isAuthenticated()){
        return res.redirect("/today");
    }
    next();
}

function checkNotAuthenticated(req,res,next){
    if(req.isAuthenticated()){
        return next();
    }
    res.redirect("/");
}


app.get("/",checkAuthenticated,(req,res)=>{
    res.render("login.ejs",{sign : "login"});
});

app.get("/register",checkAuthenticated,(req,res)=>{
    res.render("login.ejs",{sign : "register"});
});

app.get("/today",checkNotAuthenticated,(req,res)=>{
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    let d=new Date();
    let HEADING=`${days[d.getDay()]},${months[d.getMonth()]} ${d.getDate()}`;
    res.render("index.ejs",{today:true,heading:HEADING,work:false,year:d.getFullYear()});
});

app.get("/work",checkNotAuthenticated,(req,res)=>{
    let d=new Date();
    res.render("work.ejs",{work:true,today:false,year:d.getFullYear()});
});

app.get("/about",(req,res)=>{
    res.render("about.ejs",{work:false,today:false});
});

app.get('/auth/google', 
  passport.authenticate('google', { scope : ['profile', 'email'] }));
 
app.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/' }),
  function(req, res) {
    // Successful authentication, redirect success.
    res.redirect('/today');
});

app.get("/logout",checkNotAuthenticated,(req,res)=>{
    req.logOut((err)=>{
        if(err){
            console.log(err);
        }
    })
    res.redirect("/");
});

app.post("/register",async (req,res)=>{
    try{
        let { email , password} = req.body;
        let errors=[];
        if(!email || !password){
            errors.push({message: "Enter all credentials"});
        }
        if(password.length<6){
            errors.push({message: "Password must be at least 6 characters long"});
        }
        if(errors.length>0){
            res.render("login.ejs",{sign: "register",errors: errors});
        }else{
            try{
                const ifExists=await db.query("SELECT * FROM users WHERE email=$1;",[email]);
                if(ifExists.rowCount > 0){
                    errors.push({message: "Email already exists.Try to log in"});
                    res.render("login.ejs",{sign: "register",errors: errors});
                }
                else{
                    try{
                        const saltRounds=parseInt(process.env.SALTROUNDS);
                        const hashedPassword=await bcrypt.hash(password,saltRounds);
                        const result=await db.query("INSERT INTO users(email,password) VALUES($1,$2) RETURNING *;",[email,hashedPassword]);
                        passport.authenticate("local")(req, res, function(){
                            res.redirect("/");
                        });
                    }catch(err){
                        throw err;
                    }
                }
            }catch(err){
                console.log("Error new user : ",err);
                res.redirect("/register");
            }
        }
    }catch(err){
        console.log("Failed to register user : ",err);
        res.status(500).json({error: "Failed to register user"});
        res.render("register.ejs",{errors: {message: "Failed to register"}});
    }
});

app.post("/login",passport.authenticate("local",{
    successRedirect: "/today",
    failureRedirect: "/",
    failureFlash: true
}));


//Task operation like add ,delete ,get
app.get("/task/getTask",checkNotAuthenticated,async (req,res)=>{
    let today=req.query.id == 'today';
    try{
        const result=await db.query("SELECT * FROM tasks WHERE uid = $1 AND today = $2 ORDER BY tid ASC;",[req.user.uid,today]);
        res.status(200).json({data: result.rows});
    }
    catch(err){
        console.log("error get tasks : ",err);
        res.status(500).send("Failed");
    }
});

app.post("/task/addTask",checkNotAuthenticated,async (req,res)=>{
    const {newTask,today} = req.body;
    try{
        await db.query("INSERT INTO tasks(uid,task,checked,today) VALUES($1,$2,$3,$4);",[req.user.uid,newTask,false,today]);
        res.status(200).send("Succesful");
    }catch(err){
        console.log("Failed to add new task : ",err);
        res.status(500).send("Failed");
    }
});

app.put("/task/editTask",checkNotAuthenticated,async (req,res)=>{
    const {newTask,prevTask,today} = req.body;
    try{
        await db.query("UPDATE tasks SET task=$1 , checked = $2 WHERE task = $3 AND today = $4 AND uid = $5;",[newTask,false,prevTask,today,req.user.uid]);
        res.status(200).send("Succesful");
    }catch(err){
        console.log("Failed to add new task : ",err);
        res.status(500).send("Failed");
    }
});

app.delete("/task/delete",checkNotAuthenticated,async (req,res)=>{
    const { task } =req.body;
    try{
        await db.query("DELETE FROM tasks WHERE task = $1 AND uid = $2;",[task,req.user.uid]);
        res.status(200).send("Successful");
    }catch(err){
        console.log("Failed to delete task : ",err);
        res.status(500).send("Failed");
    }
});

app.patch("/task/check",checkNotAuthenticated,async (req,res)=>{
    const { task , checked } =req.body;
    try{
        await db.query("UPDATE tasks SET checked = $1 WHERE task = $2 AND uid = $3;",[checked,task,req.user.uid]);
        res.status(200).send("Successful");
    }catch(err){
        console.log("Failed to delete task : ",err);
        res.status(500).send("Failed");
    }
});

//Google generative api
// Access API key as an environment variable 
const genAI = new GoogleGenerativeAI(process.env.API_KEY);
app.post("/task/genai",checkNotAuthenticated,async (req,res)=>{
    const {work,taskArray} = req.body;
    try{
        const model = genAI.getGenerativeModel({ model: "gemini-pro"});
        let prompt=`Suggest a schedule to complete these today ${work} : `;
        taskArray.forEach((task)=>prompt+=', '+task);
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        res.status(200).json({aiText : text});
    }catch(err){
        console.log("Failed to generate response : ",err);
        res.status(500).send("Failed");
    }
});


app.listen(port,()=>{
    console.log(`Sever is listening on ${port}`);
});
