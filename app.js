import { render } from 'ejs'
import express from 'express'
import mysql from 'mysql'
import bcrypt from 'bcrypt'
import session from 'express-session'
import multer from 'multer'

const app = express()
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database:'posty'
})

const upload = multer({dest: 'public/uploads/'})

app.set('view engine', 'ejs')
app.use(express.urlencoded({extended:false}))
app.use(express.static('public'))

// preparing to use sessions 
app.use(session({
    secret: 'pixel',
    resave: true,
    saveUninitialized: false
}))

// constantly check if user logged in
app.use((req, res, next)=> {
    if (req.session.userID === undefined) {
        res.locals.isLoggedIn = false
    } else {
        res.locals.isLoggedIn = true
    }
    next()
})

app.get('/', (req, res) => {
    res.render('index')
})

// login: display form
app.get('/login', (req, res) =>{
    const user = {
        email: '',
        password: ''
    }
    res.render('login', {user:user, error:false})
})

// login: submit form
app.post('/login', (req, res) => {
    const user = {
        email: req.body.email,
        password: req.body.password
    }

    // check if account exists 
    let sql = 'SELECT * FROM profile WHERE email = ?'
    connection.query(
        sql, [user.email], (error, results) => {
            if (results.length > 0) {
                // autheticate 
                bcrypt.compare(user.password, results[0].password, (error, matches) => {
                    if (matches) {
                        req.session.userID = results[0].u_id
                        res.redirect('/dashboard')
                    } else {
                        let message = 'Incorrect Password'
                        res.render('login', {user:user, error:true, message:message})
                    }
                })
            } else {
                let message = 'Account Does not Exist'
                res.render('login', {user:user, error:true, message:message})
            }
        }
    )
})


// submit: display form
app.get('/signup', (req, res) =>{
    const user ={
        fullname: '',
        email: '',
        password: '',
        confirmPassword: ''
    }
    res.render('signup', {user, error:false})
})

// submit: submit form
app.post('/signup', (req, res) => {
    const user ={
        fullname: req.body.fullname,
        email: req.body.email,
        password: req.body.password,
        confirmPassword: req.body.confirmPassword
    }

    // check if passsword match
    if (user.password === user.confirmPassword) {
        
   
        let sql = 'SELECT * FROM profile WHERE email = ?'
        connection.query(
            sql, [user.email], (error, results) => {
                 // check if user exists
                 if (results.length > 0 ) {
                    let message = 'Account with same email already exists'
                    res.render('signup', {user, error:true, message:message})
                 } else {
                    // encrypt password 
                    bcrypt.hash(user.password, 10, (error, hash) => {
                        
                    // create account
                    let  sql = 'INSERT INTO profile (fullname, email, password) VALUES (?,?,?)'
                    connection.query(
                        sql,[
                            user.fullname,
                            user.email,
                            hash
                        ],
                        (error, results) =>{
                            res.redirect('/login')
                        }
                    )
                    })


                    
                 }
            }
        )

    } else {
        let message = 'Passwor Mismatch'
        res.render('signup', {user, error:true, message:message})
    }
})

// logout functionality 

app.get('/logout', (req, res) => {
    // kill session
    req.session.destroy(() => {
        res.redirect('/')
    })
})

// dashboard 
app.get('/dashboard', (req, res) => {
    if (res.locals.isLoggedIn) {
        res.render('dashboard')
    } else {
        res.redirect('/login')
    }
  })

// account
app.get('/account', (req, res) =>{
    if (res.locals.isLoggedIn) {
        let sql = 'SELECT * FROM profile WHERE u_id = ?'
        connection.query(
            sql, [req.session.userID], (error, results) => {
                res.render('account', {account:results[0]})
            }
        )
       
    } else {
        res.redirect('/login')
    }
   
})

// display edit account form 
app.get('/account/edit/:id', (req, res)=> {
    if (res.locals.isLoggedIn) {
        if (parseInt(req.params.id) === req.session.userID) {
            let sql = 'SELECT * FROM profile WHERE u_id = ?'
            connection.query(
                sql,
                [req.session.userID],
                (error, results) => {
                    res.render('edit-account', {profile: results[0]})
                }
            )
        } else{
            res.redirect(`/account/edit/${req.session.userID}`)
        }
    } else {
        res.redirect('/login')
    }
})

// update account
app.post('/account/edit/:id', upload.single('picture'), (req, res) => {

    const account = {
        fullname: req.body.name, 
        picture: undefined
    }

    let sql

    if (req.file) {
        account.picture = req.file.filename
        sql = 'UPDATE profile SET fullname =?, picture = ? WHERE u_id = ?'
        connection.query(
            sql,
            [
            account.fullname,
            account.picture,
            req.session.userID
            ], 
            (error, results) => {
                res.redirect('/account')
            }
        )
    } else {
        sql = 'UPDATE profile SET fullname =? WHERE u_id = ?'
        connection.query(
            sql, 
            [
                account.fullname,
                req.session.userID
            ], 
            (error, results) => {
                res.redirect('/account')
            }
        )
    }
     
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
    console.log(`app is running on PORT ${PORT}`)
})