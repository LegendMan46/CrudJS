const express = require('express');
const app = express();
const fs = require('fs');
const { MongoClient } = require('mongodb');
const { body, validationResult } = require('express-validator');
const session = require('express-session');
const encrypt = require('./encrypt');
const bcrypt = require('bcrypt');

const port = 5058;

// MongoDB Connection
const url = 'mongodb://127.0.0.1:27017';
const client = new MongoClient(url);
const dbName = 'crud';
client.connect();
const db = client.db(dbName);
const students_db = db.collection('students');
const users_db = db.collection('users');

const sessionConfig = {
    secret: 'ASD4a6d494a65sd498q4d6sa4d8864dsa8d',
    name: 'Cibrx',
    resave: false,
    saveUninitialized: false,
    cookie: {
      sameSite: 'strict',
    }
};

// Configurations
app.disable('x-powered-by'); // güvenlik için sistem hakkinda bilgi veren header lari disable ediyoruz
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.use(session(sessionConfig));

// Routes
app.get('/', (req, res) => {
    if(req.session.username) {
        res.render('index.ejs');
    } else {
        res.redirect('/login');
    }
});

app.get('/list', async (req, res) => {
    if(req.session.username) {
        let query = {};
        const { search, sort } = req.query;
        
        if (search) {
            query = { number: search };
        }
        
        let sortOptions = {};
        if (sort) {
            sortOptions[sort] = 1;
        }
        
        const result = await students_db.find(query).sort(sortOptions).toArray();
        res.status(200).json(result);
    } else {
        res.send('Kullanıcı yetkisiz.')
    }
});

app.post('/insert', async (req, res) => {
    if(req.session.username) {
        const { number, name, age } = req.body;
        const existingStudent = await students_db.findOne({ number: number }); // öğrencinin var olup olmadiği kontrolu 

        if (existingStudent) {
            return res.status(409).json({ success: false, message: "Bu okul numarasıyla bir öğrenci zaten mevcut." });
        }

        const result = await students_db.insertOne({ number, name, age });

        if(result.acknowledged) {
            res.status(201).json({ success: true, message: "Öğrenci başarı ile oluşturuldu." });
        } else {
            res.status(500).json({ success: false, message: "Öğrenci oluşturulurken bir sorun ile karşılaşıldı." });
        }
    } else {
        res.send('Kullanıcı yetkisiz.')
    }
});



app.post('/update', async (req, res) => {
    if(req.session.username) {
        const { number, name, age } = req.body
        const result = await students_db.updateOne({ number: number }, { $set: { name: name, age: age } }) // öğrencinin var olup olmadiği kontrolu 
        if(result.matchedCount > 0) {
            res.status(201).json({ success: true, message: "Öğrenci bilgileri başari ile güncellendi." })
        } else {
            res.status(400).json({ success: false, message: `${number} numarasi ile eşleşen bir öğrenci bulunmuyor.` }) 
        }
    } else {
        res.send('Kullanıcı yetkisiz.')
    }
})


app.get('/delete/:number', async (req, res) => {
    if(req.session.username) {
        const number = req.params.number
        const result = await students_db.deleteOne({ number: number }) // öğrencinin var olup olmadiği kontrolu 
        if(result.deletedCount > 0) {
            res.status(200).json({ success: true, message: `${number} Numaralı öğrenci başari ile silindi.` })
        } else {
            res.status(400).json({ success: false, message: `${number} numarasi ile eşleşen bir öğrenci bulunmuyor.` })
        }
    } else {
        res.send('Kullanıcı yetkisiz.')
    }
})


app.get('/login', (req, res) => {
    res.render('login.ejs')
})
  
app.get('/register', (req, res) => {
    res.render('register.ejs')
})

app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error('Error destroying session:', err);
        res.send('Error logging out.');
      } else {
        res.redirect('/');
      }
    });
})

app.post('/login', async function (req, res) {
        const { username, password } = req.body
        const dbResult = await users_db.findOne({ 'username': username })
        if(dbResult !== null){
          const compare = await encrypt.comparePassword(password, dbResult['password'])
          if (compare) {
            req.session.username = username
            res.json({ success: true, message: 'Giriş başarılı' });
          } else {
            res.json({ success: false, message: 'geçersiz kullanici adi veya şifre' });
          }
        } else {
          res.json({ success: false, message: 'geçersiz kullanici adi veya şifre' });
        } 
})

app.post('/register', async function (req, res) {
        const { username, password } = req.body;
        try {
          const existResult = await users_db.findOne({ 'username': username });
          if (!existResult) {
            // şifrelerimizi daha önceki bir projemde kullanmak üzere yazdigim encrypt modulu ile hashliyoruz...
            const hashedPassword = await encrypt.hashPassword(password) // şifreyi hash işlemine tabi tutularak güvenliği artirdik
    
            const result = await users_db.insertOne({
              'time': Date.now(),
              'username': username,
              'password': hashedPassword,
              'registered_ip': req.ip.replace('::ffff:', '').replace('::1', 'localhost'),
              'isBanned': false,
              'banReason': '',
              'banDate': 0,
              'banCount': 0,
            })
            res.json({ success: true, message: 'Kayıt başarılı' });
          } else {
            res.json({ success: false, message: 'bu kullanıcı zaten var' });
          }
        } catch (error) {
          console.error(error);
          res.json({ success: false, message: 'bir hata ile karşılaşıldı' });
        }  
}
);

// Routes - END


//Listening
app.listen(port, () => {
    console.log(`Your server is listening on http://localhost:${port}`)
})










